using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class CPHInline
{
    private const string MediaSpawnerConfigGuid = "59d16b77-5aa7-4336-9b18-eeb6af51a823";
    private readonly string mediaSpawnerConfigVarName = $"MediaSpawnerConfig-{MediaSpawnerConfigGuid}";
    private readonly string mediaSpawnerShaVarName = $"MediaSpawnerSha-{MediaSpawnerConfigGuid}";

    #region State Management Fields

    /// <summary>
    /// Cached configuration for performance optimization
    /// </summary>
    private MediaSpawnerConfig cachedConfig;

    /// <summary>
    /// Cached configuration SHA for change detection
    /// </summary>
    private string cachedConfigSha;

    /// <summary>
    /// Configuration cache timestamp for invalidation
    /// </summary>
    private DateTime configCacheTimestamp = DateTime.MinValue;

    /// <summary>
    /// Configuration cache TTL (Time To Live) in minutes
    /// </summary>
    private const int ConfigCacheTtlMinutes = 60;

    /// <summary>
    /// Maximum number of retries for OBS operations (0 = no retries)
    /// </summary>
    private const int MaxRetries = 0;

    /// <summary>
    /// Current log level - only messages at or above this level will be logged
    /// </summary>
    private const LogLevel CurrentLogLevel = LogLevel.Info;

    /// <summary>
    /// Currently active spawn executions
    /// </summary>
    private readonly Dictionary<string, ActiveSpawnExecution> activeSpawns = new Dictionary<string, ActiveSpawnExecution>();

    /// <summary>
    /// Execution history for debugging and analytics
    /// </summary>
    private readonly List<ExecutionRecord> executionHistory = new List<ExecutionRecord>();

    /// <summary>
    /// Maximum number of execution records to keep in memory
    /// </summary>
    private const int MaxExecutionHistory = 100;

    /// <summary>
    /// Randomization bucket selection history for consistent patterns
    /// </summary>
    private readonly Dictionary<string, RandomizationHistory> randomizationHistory = new Dictionary<string, RandomizationHistory>();

    /// <summary>
    /// Active timers managed by this action
    /// </summary>
    private readonly Dictionary<string, IDisposable> activeTimers = new Dictionary<string, IDisposable>();

    /// <summary>
    /// Dictionary to track sceneItemIds for cleanup timers (persists beyond spawn execution completion)
    /// </summary>
    private readonly Dictionary<string, int> sourceSceneItemIds = new Dictionary<string, int>();

    /// <summary>
    /// Mapping from OBSBoundsType enum to OBS WebSocket API string values
    /// </summary>
    private static readonly Dictionary<OBSBoundsType, string> OBSBoundsTypeStrings = new Dictionary<OBSBoundsType, string>
    {
        { OBSBoundsType.None, "OBS_BOUNDS_NONE" },
        { OBSBoundsType.Stretch, "OBS_BOUNDS_STRETCH" },
        { OBSBoundsType.ScaleInner, "OBS_BOUNDS_SCALE_INNER" },
        { OBSBoundsType.ScaleOuter, "OBS_BOUNDS_SCALE_OUTER" },
        { OBSBoundsType.ScaleToWidth, "OBS_BOUNDS_SCALE_TO_WIDTH" },
        { OBSBoundsType.ScaleToHeight, "OBS_BOUNDS_SCALE_TO_HEIGHT" },
        { OBSBoundsType.MaxOnly, "OBS_BOUNDS_MAX_ONLY" }
    };

    /// <summary>
    /// Single lock object for thread-safe access to all shared state
    /// </summary>
    private readonly object lockObject = new object();

    /// <summary>
    /// Flag to track if timers have been initialized
    /// </summary>
    private bool timersInitialized;

    /// <summary>
    /// Flag to track if timers are paused
    /// </summary>
    private bool timersPaused;

    /// <summary>
    /// Flag to track if system is shutting down
    /// </summary>
    private bool isShuttingDown;

    /// <summary>
    /// Dictionary to track individual timer states (paused/active)
    /// </summary>
    private readonly Dictionary<string, bool> timerStates = new Dictionary<string, bool>();

    /// <summary>
    /// Timer performance statistics
    /// </summary>
    private readonly Dictionary<string, object> timerStats = new Dictionary<string, object>();

    #endregion

    /// <summary>
    /// Initialize timer management system
    /// Called by Streamer.bot when the action is loaded (optional lifecycle hook)
    /// </summary>
    public void Init()
    {
        try
        {
            LogExecution(LogLevel.Info, "Init: Starting timer management initialization");

            // Load configuration
            if (!LoadMediaSpawnerConfigWithRetry())
            {
                LogExecution(LogLevel.Error, "Init: Failed to load MediaSpawner configuration");
                return;
            }

            // Initialize timers
            InitializeTimers();

            LogExecution(LogLevel.Info, "Init: Timer management initialization completed");
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"Init: Error during initialization: {ex.Message}");
        }
    }

    /// <summary>
    /// Clean up timer management system
    /// Called by Streamer.bot when the action is unloaded (optional lifecycle hook)
    /// </summary>
    public void Dispose()
    {
        try
        {
            LogExecution(LogLevel.Info, "Dispose: Starting graceful shutdown and timer cleanup");

            // Set shutdown flag to prevent new timer creation
            this.isShuttingDown = true;

            lock (this.lockObject)
            {
                // Stop and dispose all active timers
                int disposedCount = 0;
                foreach (IDisposable timer in this.activeTimers.Values)
                {
                    try
                    {
                        // Handle different timer types
                        if (timer is System.Timers.Timer systemTimer)
                        {
                            systemTimer.Stop();
                            systemTimer.Dispose();
                            disposedCount++;
                        }
                        else if (timer is OneTimeTimerWrapper oneTimeWrapper)
                        {
                            oneTimeWrapper.Dispose();
                            disposedCount++;
                        }
                        else
                        {
                            // Fallback for any other timer types
                            timer?.Dispose();
                            disposedCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        LogExecution(LogLevel.Warning, $"Dispose: Error disposing timer: {ex.Message}");
                    }
                }

                this.activeTimers.Clear();
                this.timerStates.Clear();
                this.timersInitialized = false;
                this.timersPaused = false;

                LogExecution(LogLevel.Info, $"Dispose: Gracefully disposed {disposedCount} timers");
            }

            LogExecution(LogLevel.Info, "Dispose: Graceful shutdown and timer cleanup completed");
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"Dispose: Error during graceful shutdown: {ex.Message}");
        }
    }

    /// <summary>
    /// Main entry point for MediaSpawner spawn execution
    /// Handles command, Twitch, and manual trigger detection, routing, and spawn execution coordination
    /// Time-based triggers are now managed internally via timers initialized in Init()
    /// </summary>
    /// <returns>True if execution succeeded, false otherwise</returns>
    public bool Execute()
    {
        Stopwatch stopwatch = Stopwatch.StartNew();
        string executionId = Guid.NewGuid().ToString("N").Substring(0, 8);

        try
        {
            LogExecution(LogLevel.Info, $"Execute[{executionId}]: Starting MediaSpawner execution");

            // Validate execution environment
            if (!ValidateExecutionEnvironment())
            {
                LogExecution(LogLevel.Error, $"Execute[{executionId}]: Execution environment validation failed");
                return false;
            }

            // Load configuration (lightweight - uses cache when possible)
            if (!LoadMediaSpawnerConfig())
            {
                LogExecution(LogLevel.Error, $"Execute[{executionId}]: Failed to load MediaSpawner configuration");
                return false;
            }

            // Check if timers need initialization (fallback for when Init() isn't called)
            if (!this.timersInitialized)
            {
                LogExecution(LogLevel.Info, $"Execute[{executionId}]: Initializing timers (fallback initialization)");
                InitializeTimers();
            }

            // Detect trigger type and source with validation
            string source = CPH.GetSource().ToString();

            // Get trigger name for routing
            if (!CPH.TryGetArg("triggerName", out string triggerName) || string.IsNullOrWhiteSpace(triggerName))
            {
                LogExecution(LogLevel.Error, $"Execute[{executionId}]: No triggerName argument provided");
                return false;
            }

            LogExecution(LogLevel.Info, $"Execute[{executionId}]: Trigger detected - TriggerName: '{triggerName}', Source: '{source ?? "null"}'");

            // Route to appropriate handler based on trigger type
            bool executionResult;
            string handlerName = "";

            try
            {
                // Route based on source and trigger name patterns
                if (source?.ToLowerInvariant() == "command" || triggerName.ToLowerInvariant() == "command")
                {
                    handlerName = "HandleCommandTrigger";
                    executionResult = HandleCommandTrigger(source);
                }
                else if (source?.ToLowerInvariant() == "twitch" ||
                         triggerName == "Follow" || triggerName == "Subscription" || triggerName == "Cheer" ||
                         triggerName == "Gift Subscription" || triggerName == "Channel Point Reward" ||
                         triggerName == "Raid" || triggerName == "Host" || triggerName == "Announcement" ||
                         triggerName == "Present Viewers")
                {
                    handlerName = "HandleTwitchTrigger";
                    executionResult = HandleTwitchTrigger(source);
                }
                else if (triggerName.ToLowerInvariant() == "manual" || triggerName.ToLowerInvariant() == "c# method")
                {
                    handlerName = "HandleManualTrigger";
                    executionResult = HandleManualTrigger();
                }
                else
                {
                    LogExecution(LogLevel.Warning, $"Execute[{executionId}]: Unknown trigger type '{triggerName}' from source '{source ?? "null"}'");
                    return false;
                }
            }
            catch (Exception handlerEx)
            {
                LogExecution(LogLevel.Error, $"Execute[{executionId}]: Error in {handlerName}: {handlerEx.Message}");
                LogExecution(LogLevel.Error, $"Execute[{executionId}]: Handler stack trace: {handlerEx.StackTrace}");
                return false;
            }

            // Log execution result with performance metrics
            stopwatch.Stop();
            long executionTime = stopwatch.ElapsedMilliseconds;

            if (executionResult)
            {
                LogExecution(LogLevel.Info, $"Execute[{executionId}]: Spawn execution completed successfully in {executionTime}ms");
            }
            else
            {
                LogExecution(LogLevel.Warning, $"Execute[{executionId}]: Spawn execution completed with issues in {executionTime}ms");
            }

            return executionResult;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            long executionTime = stopwatch.ElapsedMilliseconds;

            LogExecution(LogLevel.Error, $"Execute[{executionId}]: Unexpected error during execution after {executionTime}ms: {ex.Message}");
            LogExecution(LogLevel.Error, $"Execute[{executionId}]: Stack trace: {ex.StackTrace}");

            // Safety cleanup - ensure timers are in a consistent state
            try
            {
                LogExecution(LogLevel.Info, $"Execute[{executionId}]: Performing safety cleanup after error");
                CleanupAllTimers();
            }
            catch (Exception cleanupEx)
            {
                LogExecution(LogLevel.Error, $"Execute[{executionId}]: Error during safety cleanup: {cleanupEx.Message}");
            }

            return false;
        }
    }

    /// <summary>
    /// Export analytics data to a file
    /// </summary>
    /// <returns>True if export succeeded, false otherwise</returns>
    public bool ExportAnalytics()
    {
        try
        {
            // Get export parameters
            if (!CPH.TryGetArg("filePath", out string filePath) || string.IsNullOrWhiteSpace(filePath))
            {
                // Default to desktop if no path provided
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                filePath = Path.Combine(desktopPath, $"MediaSpawner_Analytics_{DateTime.Now:yyyyMMdd_HHmmss}.json");
            }

            // Get optional parameters
            CPH.TryGetArg("includeHistory", out bool includeHistory);
            CPH.TryGetArg("includeActiveSpawns", out bool includeActiveSpawns);
            CPH.TryGetArg("includeRandomization", out bool includeRandomization);

            // Prepare analytics data
            Dictionary<string, object> analyticsData = new Dictionary<string, object>
            {
                ["exportTimestamp"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                ["exportVersion"] = "1.0",
                ["systemState"] = new Dictionary<string, object>
                {
                    ["activeSpawnsCount"] = this.activeSpawns.Count,
                    ["executionHistoryCount"] = this.executionHistory.Count,
                    ["randomizationHistoryCount"] = this.randomizationHistory.Count,
                    ["configCacheValid"] = IsConfigCacheValid(),
                    ["configCacheAge"] = this.configCacheTimestamp == DateTime.MinValue ?
                  "Never" : DateTime.UtcNow.Subtract(this.configCacheTimestamp).ToString(),
                },
            };

            // Add execution history if requested
            if (includeHistory)
            {
                List<Dictionary<string, object>> historyData = this.executionHistory.Select(record => new Dictionary<string, object>
                {
                    ["executionId"] = record.ExecutionId,
                    ["spawnId"] = record.SpawnId,
                    ["spawnName"] = record.SpawnName,
                    ["triggerType"] = record.TriggerType,
                    ["startTime"] = record.StartTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    ["endTime"] = record.EndTime?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    ["duration"] = record.Duration?.ToString(),
                    ["status"] = record.Status,
                    ["errorMessage"] = record.ErrorMessage,
                    ["context"] = record.Context,
                }).ToList();

                analyticsData["executionHistory"] = historyData;
            }

            // Add active spawns if requested
            if (includeActiveSpawns)
            {
                List<Dictionary<string, object>> activeSpawnsData = this.activeSpawns.Values.Select(execution => new Dictionary<string, object>
                {
                    ["executionId"] = execution.ExecutionId,
                    ["spawnId"] = execution.SpawnId,
                    ["spawnName"] = execution.SpawnName,
                    ["triggerType"] = execution.TriggerType,
                    ["startTime"] = execution.StartTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    ["expectedEndTime"] = execution.ExpectedEndTime?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    ["status"] = execution.Status,
                    ["context"] = execution.Context,
                }).ToList();

                analyticsData["activeSpawns"] = activeSpawnsData;
            }

            // Add randomization history if requested
            if (includeRandomization)
            {
                List<Dictionary<string, object>> randomizationData = this.randomizationHistory.Values.Select(history => new Dictionary<string, object>
                {
                    ["bucketId"] = history.BucketId,
                    ["selectionCount"] = history.SelectionCount,
                    ["lastSelectionTime"] = history.LastSelectionTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    ["lastSelectedMembers"] = history.LastSelectedMembers,
                    ["selectionPattern"] = history.SelectionPattern,
                }).ToList();

                analyticsData["randomizationHistory"] = randomizationData;
            }

            // Serialize and write to file
            string jsonData = JsonConvert.SerializeObject(analyticsData, Formatting.Indented);
            File.WriteAllText(filePath, jsonData);

            LogExecution(LogLevel.Info, $"ExportAnalytics: Successfully exported analytics to {filePath}");
            LogExecution(LogLevel.Info, $"ExportAnalytics: Exported {this.executionHistory.Count} execution records, {this.activeSpawns.Count} active spawns, {this.randomizationHistory.Count} randomization histories");

            // Set result in global variable for other actions
            CPH.SetGlobalVar("MediaSpawner_ExportPath", filePath, persisted: false);
            CPH.SetGlobalVar("MediaSpawner_ExportSuccess", true, persisted: false);

            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ExportAnalytics: Error exporting analytics: {ex.Message}");
            CPH.SetGlobalVar("MediaSpawner_ExportSuccess", false, persisted: false);
            return false;
        }
    }

    /// <summary>
    /// Handle command-based triggers (Streamer.bot commands)
    /// </summary>
    /// <param name="source">The command source</param>
    /// <returns>True if command was handled successfully</returns>
    private bool HandleCommandTrigger(string source)
    {
        try
        {
            LogExecution(LogLevel.Info, $"HandleCommandTrigger: Processing command trigger from source: {source}");

            // Get command details from Streamer.bot
            if (!CPH.TryGetArg("command", out string command) || string.IsNullOrWhiteSpace(command))
            {
                LogExecution(LogLevel.Error, "HandleCommandTrigger: No command argument provided");
                return false;
            }

            // Get additional command context
            CPH.TryGetArg("userId", out string userId);
            CPH.TryGetArg("userName", out string userName);
            CPH.TryGetArg("rawInput", out string rawInput);
            CPH.TryGetArg("isInternal", out bool isInternal);
            CPH.TryGetArg("isBotAccount", out bool isBotAccount);

            LogExecution(LogLevel.Info, $"HandleCommandTrigger: Command '{command}' from user '{userName}' (ID: {userId})");

            // Find matching spawns with streamerbot.command triggers
            List<Spawn> matchingSpawns = FindSpawnsByTriggerType("streamerbot.command");

            if (matchingSpawns.Count == 0)
            {
                LogExecution(LogLevel.Info, "HandleCommandTrigger: No spawns found with streamerbot.command triggers");
                return true; // Not an error, just no matching spawns
            }

            // Filter spawns based on command configuration
            List<Spawn> validSpawns = FilterSpawnsByCommandConfig(matchingSpawns, command, userName, rawInput, isInternal, isBotAccount);

            if (validSpawns.Count == 0)
            {
                LogExecution(LogLevel.Info, "HandleCommandTrigger: No spawns match the command configuration");
                return true; // Not an error, just no matching spawns
            }

            // Validate each spawn before execution
            List<Spawn> executableSpawns = new List<Spawn>();
            foreach (Spawn spawn in validSpawns)
            {
                ValidationResult spawnValidation = ValidateSpawnForExecution(spawn, "streamerbot.command");
                if (spawnValidation.IsValid && HasEnabledAssets(spawn))
                {
                    executableSpawns.Add(spawn);
                }
                else
                {
                    LogExecution(LogLevel.Warning, $"HandleCommandTrigger: Skipping spawn '{spawn.Name}' - validation failed");
                }
            }

            if (executableSpawns.Count == 0)
            {
                LogExecution(LogLevel.Info, "HandleCommandTrigger: No spawns are ready for execution after validation");
                return true; // Not an error, just no ready spawns
            }

            // Execute matching spawns
            bool executionResult = ExecuteSpawns(executableSpawns, "command", new Dictionary<string, object>
            {
                ["command"] = command,
                ["userId"] = userId,
                ["userName"] = userName,
                ["rawInput"] = rawInput,
                ["source"] = source,
                ["isInternal"] = isInternal,
                ["isBotAccount"] = isBotAccount,
                ["executionTime"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            });


            return executionResult;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"HandleCommandTrigger: Error processing command trigger: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Handle Twitch event-based triggers
    /// </summary>
    /// <param name="source">The Twitch event source (for logging only)</param>
    /// <returns>True if event was handled successfully</returns>
    private bool HandleTwitchTrigger(string source)
    {
        try
        {
            LogExecution(LogLevel.Info, $"HandleTwitchTrigger: Processing Twitch trigger from source: {source}");

            // Get the actual trigger name from Streamer.bot
            if (!CPH.TryGetArg("triggerName", out string triggerName) || string.IsNullOrWhiteSpace(triggerName))
            {
                LogExecution(LogLevel.Error, "HandleTwitchTrigger: No triggerName argument provided");
                return false;
            }
            LogExecution(LogLevel.Info, $"HandleTwitchTrigger: Trigger name from CPH.TryGetArg('triggerName'): {triggerName}");

            // Determine specific Twitch event type
            string twitchEventType = DetermineTwitchEventType(triggerName);

            if (string.IsNullOrWhiteSpace(twitchEventType))
            {
                LogExecution(LogLevel.Error, $"HandleTwitchTrigger: Unable to determine Twitch event type from trigger name: {triggerName}");
                return false;
            }

            LogExecution(LogLevel.Info, $"HandleTwitchTrigger: Detected Twitch event type: {twitchEventType}");

            // Find matching spawns with Twitch triggers
            List<Spawn> matchingSpawns = FindSpawnsByTriggerType($"twitch.{twitchEventType}");

            if (matchingSpawns.Count == 0)
            {
                LogExecution(LogLevel.Info, $"HandleTwitchTrigger: No spawns found with twitch.{twitchEventType} triggers");
                return true; // Not an error, just no matching spawns
            }

            // Get Twitch event data
            Dictionary<string, object> eventData = GetTwitchEventData(twitchEventType);

            // Filter spawns based on Twitch event configuration
            List<Spawn> validSpawns = FilterSpawnsByTwitchConfig(matchingSpawns, twitchEventType, eventData);

            if (validSpawns.Count == 0)
            {
                LogExecution(LogLevel.Info, "HandleTwitchTrigger: No spawns match the Twitch event configuration");
                return true; // Not an error, just no matching spawns
            }

            // Validate each spawn before execution
            List<Spawn> executableSpawns = new List<Spawn>();
            foreach (Spawn spawn in validSpawns)
            {
                ValidationResult spawnValidation = ValidateSpawnForExecution(spawn, $"twitch.{twitchEventType}");
                if (spawnValidation.IsValid && HasEnabledAssets(spawn))
                {
                    // Additional Twitch-specific validation
                    if (ValidateTwitchEventConditions(spawn, twitchEventType, eventData))
                    {
                        executableSpawns.Add(spawn);
                    }
                    else
                    {
                        LogExecution(LogLevel.Info, $"HandleTwitchTrigger: Spawn '{spawn.Name}' failed Twitch-specific validation");
                    }
                }
                else
                {
                    LogExecution(LogLevel.Warning, $"HandleTwitchTrigger: Skipping spawn '{spawn.Name}' - validation failed");
                }
            }

            if (executableSpawns.Count == 0)
            {
                LogExecution(LogLevel.Info, "HandleTwitchTrigger: No spawns are ready for execution after validation");
                return true; // Not an error, just no ready spawns
            }

            // Execute matching spawns
            bool executionResult = ExecuteSpawns(executableSpawns, $"twitch.{twitchEventType}", eventData);


            return executionResult;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"HandleTwitchTrigger: Error processing Twitch trigger: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Handle manual triggers (Execute C# Method calls)
    /// </summary>
    /// <returns>True if manual trigger was handled successfully</returns>
    private bool HandleManualTrigger()
    {
        try
        {
            LogExecution(LogLevel.Info, "HandleManualTrigger: Processing manual trigger");

            // Get spawn ID from arguments if provided
            if (!CPH.TryGetArg("spawnId", out string spawnId) || string.IsNullOrWhiteSpace(spawnId))
            {
                LogExecution(LogLevel.Error, "HandleManualTrigger: No spawnId argument provided for manual trigger");
                return false;
            }

            // Validate spawn ID format
            if (!IsValidSpawnId(spawnId))
            {
                LogExecution(LogLevel.Error, $"HandleManualTrigger: Invalid spawn ID format: '{spawnId}'");
                return false;
            }

            // Find the specific spawn
            Spawn targetSpawn = FindSpawnById(spawnId);

            if (targetSpawn == null)
            {
                LogExecution(LogLevel.Error, $"HandleManualTrigger: Spawn with ID '{spawnId}' not found");
                return false;
            }

            // Validate spawn state and configuration
            ValidationResult spawnValidation = ValidateSpawnForExecution(targetSpawn, "manual");
            if (!spawnValidation.IsValid)
            {
                LogExecution(LogLevel.Error, $"HandleManualTrigger: Spawn validation failed: {spawnValidation}");
                return false;
            }

            if (!targetSpawn.Enabled)
            {
                LogExecution(LogLevel.Warning, $"HandleManualTrigger: Spawn '{targetSpawn.Name}' is disabled");
                return false;
            }

            if (targetSpawn.Trigger.Type != "manual")
            {
                LogExecution(LogLevel.Warning, $"HandleManualTrigger: Spawn '{targetSpawn.Name}' is not configured for manual triggers");
                return false;
            }

            // Check if spawn has any enabled assets
            if (!HasEnabledAssets(targetSpawn))
            {
                LogExecution(LogLevel.Warning, $"HandleManualTrigger: Spawn '{targetSpawn.Name}' has no enabled assets");
                return false;
            }


            // Execute the specific spawn
            bool executionResult = ExecuteSpawns(new List<Spawn> { targetSpawn }, "manual", new Dictionary<string, object>
            {
                ["spawnId"] = spawnId,
                ["triggerType"] = "manual",
                ["executionTime"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            });


            return executionResult;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"HandleManualTrigger: Error processing manual trigger: {ex.Message}");
            return false;
        }
    }

    #region Timer Management Helper Methods

    /// <summary>
    /// Initialize all timers based on current MediaSpawnerConfig
    /// </summary>
    private void InitializeTimers()
    {
        try
        {
            lock (this.lockObject)
            {
                // Clear any existing timers first
                CleanupAllTimers();

                if (this.cachedConfig?.Profiles == null)
                {
                    LogExecution(LogLevel.Info, "InitializeTimers: No configuration loaded, skipping timer initialization");
                    return;
                }

                int timerCount = 0;

                // Find all time-triggered spawns and create timers for them
                foreach (SpawnProfile profile in this.cachedConfig.Profiles)
                {
                    if (profile.Spawns != null)
                    {
                        foreach (Spawn spawn in profile.Spawns)
                        {
                            if (spawn.Enabled && spawn.Trigger?.Type?.StartsWith("time.") == true)
                            {
                                if (CreateTimerForSpawn(spawn))
                                {
                                    timerCount++;
                                }
                            }
                        }
                    }
                }

                this.timersInitialized = true;
                LogExecution(LogLevel.Info, $"InitializeTimers: Successfully initialized {timerCount} timers");

                // Log timer status for monitoring
                Dictionary<string, object> status = GetTimerStatus();
                LogExecution(LogLevel.Info, $"InitializeTimers: Timer status - Active: {status["activeTimerCount"]}, Initialized: {status["timersInitialized"]}");
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"InitializeTimers: Error during timer initialization: {ex.Message}");
        }
    }

    /// <summary>
    /// Basic validation for spawn before timer creation
    /// </summary>
    /// <param name="spawn">The spawn to validate</param>
    /// <returns>True if spawn is valid for timer creation, false otherwise</returns>
    private bool ValidateSpawnForTimerCreation(Spawn spawn)
    {
        try
        {
            if (spawn == null)
            {
                LogExecution(LogLevel.Warning, "ValidateSpawnForTimerCreation: Spawn is null");
                return false;
            }

            if (string.IsNullOrWhiteSpace(spawn.Id))
            {
                LogExecution(LogLevel.Warning, "ValidateSpawnForTimerCreation: Spawn ID is null or empty");
                return false;
            }

            if (string.IsNullOrWhiteSpace(spawn.Name))
            {
                LogExecution(LogLevel.Warning, $"ValidateSpawnForTimerCreation: Spawn name is null or empty for ID '{spawn.Id}'");
                return false;
            }

            if (spawn.Trigger == null)
            {
                LogExecution(LogLevel.Warning, $"ValidateSpawnForTimerCreation: Spawn '{spawn.Name}' has no trigger");
                return false;
            }

            if (spawn.Trigger.Config == null)
            {
                LogExecution(LogLevel.Warning, $"ValidateSpawnForTimerCreation: Spawn '{spawn.Name}' has no trigger configuration");
                return false;
            }

            if (string.IsNullOrWhiteSpace(spawn.Trigger.Type))
            {
                LogExecution(LogLevel.Warning, $"ValidateSpawnForTimerCreation: Spawn '{spawn.Name}' has no trigger type");
                return false;
            }

            // Check if spawn is enabled
            if (!spawn.Enabled)
            {
                LogExecution(LogLevel.Info, $"ValidateSpawnForTimerCreation: Spawn '{spawn.Name}' is disabled, skipping timer creation");
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ValidateSpawnForTimerCreation: Error validating spawn: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Create a timer for a specific spawn based on its trigger configuration
    /// </summary>
    /// <param name="spawn">The spawn to create a timer for</param>
    /// <returns>True if timer was created successfully, false otherwise</returns>
    private bool CreateTimerForSpawn(Spawn spawn)
    {
        try
        {
            // Check if system is shutting down
            if (this.isShuttingDown)
            {
                LogExecution(LogLevel.Info, $"CreateTimerForSpawn: System is shutting down, skipping timer creation for spawn '{spawn.Name}'");
                return false;
            }

            if (spawn.Trigger?.Config == null)
            {
                LogExecution(LogLevel.Warning, $"CreateTimerForSpawn: Spawn '{spawn.Name}' has no trigger configuration");
                return false;
            }

            string triggerType = spawn.Trigger.Type.Replace("time.", "");
            Dictionary<string, object> config = spawn.Trigger.Config;

            LogExecution(LogLevel.Info, $"CreateTimerForSpawn: Creating {triggerType} timer for spawn '{spawn.Name}'");

            // Basic validation before timer creation
            if (!ValidateSpawnForTimerCreation(spawn))
            {
                LogExecution(LogLevel.Warning, $"CreateTimerForSpawn: Spawn '{spawn.Name}' failed validation, skipping timer creation");
                return false;
            }

            bool timerCreated = false;
            Exception lastException = null;

            // Create timer based on trigger type with error recovery
            try
            {
                switch (triggerType)
                {
                    case "atDateTime":
                        timerCreated = CreateOneTimeTimer(spawn, config);
                        break;
                    case "dailyAt":
                        timerCreated = CreateDailyTimer(spawn, config);
                        break;
                    case "weeklyAt":
                        timerCreated = CreateWeeklyTimer(spawn, config);
                        break;
                    case "monthlyOn":
                        timerCreated = CreateMonthlyTimer(spawn, config);
                        break;
                    case "everyNMinutes":
                        timerCreated = CreateIntervalTimer(spawn, config);
                        break;
                    case "minuteOfHour":
                        timerCreated = CreateMinuteOfHourTimer(spawn, config);
                        break;
                    default:
                        LogExecution(LogLevel.Warning, $"CreateTimerForSpawn: Unknown trigger type '{triggerType}' for spawn '{spawn.Name}'");
                        return false;
                }
            }
            catch (Exception timerEx)
            {
                lastException = timerEx;
                LogExecution(LogLevel.Error, $"CreateTimerForSpawn: Error creating {triggerType} timer for spawn '{spawn.Name}': {timerEx.Message}");
            }

            if (!timerCreated)
            {
                LogExecution(LogLevel.Warning, $"CreateTimerForSpawn: Failed to create {triggerType} timer for spawn '{spawn.Name}'");

                // Basic error recovery - log the failure but don't crash
                if (lastException != null)
                {
                    LogExecution(LogLevel.Error, $"CreateTimerForSpawn: Last exception details: {lastException.Message}");
                }

                return false;
            }

            LogExecution(LogLevel.Info, $"CreateTimerForSpawn: Successfully created {triggerType} timer for spawn '{spawn.Name}'");

            // Update statistics
            UpdateTimerStats("created", spawn.Id);

            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"CreateTimerForSpawn: Unhandled error creating timer for spawn '{spawn.Name}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Create a one-time timer that fires at a specific DateTime
    /// Uses System.Threading.Timer for one-time execution as specified in task requirements
    /// </summary>
    /// <param name="spawn">The spawn to create a timer for</param>
    /// <param name="config">The trigger configuration</param>
    /// <returns>True if timer was created successfully, false otherwise</returns>
    private bool CreateOneTimeTimer(Spawn spawn, Dictionary<string, object> config)
    {
        try
        {
            if (!config.ContainsKey("isoDateTime") || !(config["isoDateTime"] is string isoDateTime))
            {
                LogExecution(LogLevel.Warning, $"CreateOneTimeTimer: Missing or invalid 'isoDateTime' in config for spawn '{spawn.Name}'");
                return false;
            }

            // Parse DateTime with timezone consideration
            DateTime targetTime;
            if (!DateTime.TryParse(isoDateTime, out targetTime))
            {
                // Try parsing as UTC if local parsing fails
                if (DateTime.TryParse(isoDateTime, null, System.Globalization.DateTimeStyles.AssumeUniversal, out targetTime))
                {
                    targetTime = targetTime.ToLocalTime();
                    LogExecution(LogLevel.Info, $"CreateOneTimeTimer: Parsed '{isoDateTime}' as UTC and converted to local time: {targetTime}");
                }
                else
                {
                    LogExecution(LogLevel.Warning, $"CreateOneTimeTimer: Invalid DateTime format '{isoDateTime}' for spawn '{spawn.Name}'");
                    return false;
                }
            }

            DateTime now = DateTime.Now;
            if (targetTime <= now)
            {
                LogExecution(LogLevel.Warning, $"CreateOneTimeTimer: Target time {targetTime} is in the past for spawn '{spawn.Name}', skipping");
                return false;
            }

            // Calculate delay with millisecond precision
            TimeSpan delay = targetTime - now;
            int delayMs = (int)Math.Min(delay.TotalMilliseconds, int.MaxValue);

            if (delayMs <= 0)
            {
                LogExecution(LogLevel.Warning, $"CreateOneTimeTimer: Calculated delay is {delayMs}ms for spawn '{spawn.Name}', skipping");
                return false;
            }

            // Create System.Threading.Timer for one-time execution
            Timer timer = new Timer(
              state => OnOneTimeTimerElapsed(spawn, "atDateTime"),
              null,
              delayMs,
              Timeout.Infinite // One-time timer
            );

            lock (this.lockObject)
            {
                // Store the timer in a way that allows proper disposal
                this.activeTimers[spawn.Id] = new OneTimeTimerWrapper(timer);
                this.timerStates[spawn.Id] = false; // false = active
            }

            LogExecution(LogLevel.Info, $"CreateOneTimeTimer: Created one-time timer for spawn '{spawn.Name}' to fire at {targetTime} (in {delay.TotalMinutes:F1} minutes)");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"CreateOneTimeTimer: Error creating timer for spawn '{spawn.Name}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Wrapper class for System.Threading.Timer to allow proper disposal
    /// </summary>
    private class OneTimeTimerWrapper : IDisposable
    {
        private readonly Timer _timer;
        private bool _disposed;

        public OneTimeTimerWrapper(Timer timer)
        {
            _timer = timer;
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _timer?.Dispose();
                _disposed = true;
            }
        }
    }

    /// <summary>
    /// Handle one-time timer elapsed events - executes spawns when one-time timers fire
    /// </summary>
    /// <param name="spawn">The spawn to execute</param>
    /// <param name="triggerType">The type of timer trigger</param>
    private void OnOneTimeTimerElapsed(Spawn spawn, string triggerType)
    {
        try
        {
            // Basic safety checks
            if (spawn == null)
            {
                LogExecution(LogLevel.Warning, "OnOneTimeTimerElapsed: Spawn is null, skipping execution");
                return;
            }

            if (string.IsNullOrWhiteSpace(spawn.Id))
            {
                LogExecution(LogLevel.Warning, "OnOneTimeTimerElapsed: Spawn ID is null or empty, skipping execution");
                return;
            }

            // Thread safety - access shared state with lock
            lock (this.lockObject)
            {
                // Validate spawn is still enabled and configuration hasn't changed
                if (!IsSpawnStillValid(spawn))
                {
                    LogExecution(LogLevel.Info, $"OnOneTimeTimerElapsed: Spawn {spawn.Name} is no longer valid, skipping");
                    return;
                }

                // One-time timers should always execute when they fire
                LogExecution(LogLevel.Info, $"OnOneTimeTimerElapsed: Executing one-time spawn '{spawn.Name}' from {triggerType} timer");
                ExecuteSpawnFromTimer(spawn, triggerType);

                // Remove the timer from active timers since it's one-time
                if (this.activeTimers.ContainsKey(spawn.Id))
                {
                    try
                    {
                        this.activeTimers[spawn.Id].Dispose();
                        this.activeTimers.Remove(spawn.Id);
                        LogExecution(LogLevel.Info, $"OnOneTimeTimerElapsed: Removed completed one-time timer for spawn '{spawn.Name}'");
                    }
                    catch (Exception disposeEx)
                    {
                        LogExecution(LogLevel.Error, $"OnOneTimeTimerElapsed: Error disposing timer for spawn '{spawn.Name}': {disposeEx.Message}");
                        // Still remove from dictionary even if disposal failed
                        this.activeTimers.Remove(spawn.Id);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"OnOneTimeTimerElapsed: Error executing one-time timer for spawn {spawn?.Name ?? "unknown"}: {ex.Message}");
        }
    }

    /// <summary>
    /// Create a duration cleanup timer for automatic OBS source deletion
    /// </summary>
    /// <param name="sourceName">The name of the OBS source to cleanup</param>
    /// <param name="durationMs">Duration in milliseconds before cleanup</param>
    /// <returns>True if timer was created successfully, false otherwise</returns>
    private bool CreateDurationCleanupTimer(string sourceName, double durationMs)
    {
        try
        {
            // Check system state before proceeding
            if (this.isShuttingDown)
            {
                LogExecution(LogLevel.Warning, "CreateDurationCleanupTimer: System is shutting down, skipping cleanup timer creation");
                return false;
            }

            // Validate input parameters
            if (string.IsNullOrWhiteSpace(sourceName))
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                    ["durationMs"] = durationMs,
                    ["operation"] = "CreateDurationCleanupTimer"
                };
                LogStructuredWarning("CreateDurationCleanupTimer", "Source name is null or empty", context);
                return false;
            }

            if (durationMs <= 0)
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                    ["durationMs"] = durationMs,
                    ["operation"] = "CreateDurationCleanupTimer"
                };
                LogStructuredWarning("CreateDurationCleanupTimer", $"Duration {durationMs}ms is invalid for source '{sourceName}'", context);
                return false;
            }

            // Calculate delay with millisecond precision
            int delayMs = (int)Math.Min(durationMs, int.MaxValue);

            if (delayMs <= 0)
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                    ["durationMs"] = durationMs,
                    ["calculatedDelayMs"] = delayMs,
                    ["operation"] = "CreateDurationCleanupTimer"
                };
                LogStructuredWarning("CreateDurationCleanupTimer", $"Calculated delay is {delayMs}ms for source '{sourceName}', skipping", context);
                return false;
            }

            // Check for duplicate timer
            string timerKey = $"cleanup-{sourceName}";
            lock (this.lockObject)
            {
                if (this.activeTimers.ContainsKey(timerKey))
                {
                    Dictionary<string, object> context = new Dictionary<string, object>
                    {
                        ["sourceName"] = sourceName,
                        ["durationMs"] = durationMs,
                        ["timerKey"] = timerKey,
                        ["operation"] = "CreateDurationCleanupTimer"
                    };
                    LogStructuredWarning("CreateDurationCleanupTimer", $"Cleanup timer already exists for source '{sourceName}', replacing existing timer", context);

                    // Dispose existing timer before creating new one
                    try
                    {
                        this.activeTimers[timerKey].Dispose();
                        this.activeTimers.Remove(timerKey);
                        this.timerStates.Remove(timerKey);
                    }
                    catch (Exception disposeEx)
                    {
                        LogExecution(LogLevel.Warning, $"CreateDurationCleanupTimer: Error disposing existing timer for source '{sourceName}': {disposeEx.Message}");
                    }
                }
            }

            // Create System.Threading.Timer for one-time cleanup execution
            Timer timer = null;
            try
            {
                timer = new Timer(
                  state => OnDurationCleanupElapsed(sourceName),
                  null,
                  delayMs,
                  Timeout.Infinite // One-time timer
                );
            }
            catch (Exception timerEx)
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                    ["durationMs"] = durationMs,
                    ["delayMs"] = delayMs,
                    ["operation"] = "CreateDurationCleanupTimer"
                };
                string errorMessage = CreateStructuredErrorMessage("CreateDurationCleanupTimer", timerEx, context);
                LogStructuredError("CreateDurationCleanupTimer", "Failed to create System.Threading.Timer", context);
                return false;
            }

            // Store the timer safely
            lock (this.lockObject)
            {
                try
                {
                    // Double-check system state before storing
                    if (this.isShuttingDown)
                    {
                        timer?.Dispose();
                        LogExecution(LogLevel.Warning, "CreateDurationCleanupTimer: System shutdown detected during timer creation, disposing timer");
                        return false;
                    }

                    // Store the timer in a way that allows proper disposal
                    this.activeTimers[timerKey] = new OneTimeTimerWrapper(timer);
                    this.timerStates[timerKey] = false; // false = active
                }
                catch (Exception storeEx)
                {
                    timer?.Dispose();
                    Dictionary<string, object> context = new Dictionary<string, object>
                    {
                        ["sourceName"] = sourceName,
                        ["durationMs"] = durationMs,
                        ["timerKey"] = timerKey,
                        ["operation"] = "CreateDurationCleanupTimer"
                    };
                    string errorMessage = CreateStructuredErrorMessage("CreateDurationCleanupTimer", storeEx, context);
                    LogStructuredError("CreateDurationCleanupTimer", "Failed to store timer in activeTimers dictionary", context);
                    return false;
                }
            }

            Dictionary<string, object> successContext = new Dictionary<string, object>
            {
                ["sourceName"] = sourceName,
                ["durationMs"] = durationMs,
                ["delayMs"] = delayMs,
                ["timerKey"] = timerKey,
                ["operation"] = "CreateDurationCleanupTimer"
            };
            LogStructuredInfo("CreateDurationCleanupTimer", $"Successfully created cleanup timer for source '{sourceName}' to fire in {durationMs}ms", successContext);
            return true;
        }
        catch (Exception ex)
        {
            Dictionary<string, object> context = new Dictionary<string, object>
            {
                ["sourceName"] = sourceName,
                ["durationMs"] = durationMs,
                ["operation"] = "CreateDurationCleanupTimer"
            };
            string errorMessage = CreateStructuredErrorMessage("CreateDurationCleanupTimer", ex, context);
            LogStructuredError("CreateDurationCleanupTimer", "Unexpected error creating cleanup timer", context);
            return false;
        }
    }

    /// <summary>
    /// Handle duration cleanup timer elapsed events - deletes OBS sources when duration expires
    /// </summary>
    /// <param name="sourceName">The name of the source to cleanup</param>
    private void OnDurationCleanupElapsed(string sourceName)
    {
        try
        {
            // Basic safety checks
            if (string.IsNullOrWhiteSpace(sourceName))
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                    ["operation"] = "OnDurationCleanupElapsed"
                };
                LogStructuredWarning("OnDurationCleanupElapsed", "Source name is null or empty, skipping cleanup", context);
                return;
            }

            // Check system state
            if (this.isShuttingDown)
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                    ["operation"] = "OnDurationCleanupElapsed"
                };
                LogExecution(LogLevel.Info, "OnDurationCleanupElapsed: System is shutting down, skipping cleanup");
                return;
            }

            string timerKey = $"cleanup-{sourceName}";
            bool timerFound = false;

            // Thread safety - access shared state with lock
            lock (this.lockObject)
            {
                // Remove the timer from active timers since it's one-time
                if (this.activeTimers.ContainsKey(timerKey))
                {
                    timerFound = true;
                    try
                    {
                        this.activeTimers[timerKey].Dispose();
                        this.activeTimers.Remove(timerKey);
                        this.timerStates.Remove(timerKey);

                        Dictionary<string, object> successContext = new Dictionary<string, object>
                        {
                            ["sourceName"] = sourceName,
                            ["timerKey"] = timerKey,
                            ["operation"] = "OnDurationCleanupElapsed"
                        };
                        LogStructuredInfo("OnDurationCleanupElapsed", $"Successfully removed cleanup timer for source '{sourceName}'", successContext);
                    }
                    catch (Exception disposeEx)
                    {
                        Dictionary<string, object> context = new Dictionary<string, object>
                        {
                            ["sourceName"] = sourceName,
                            ["timerKey"] = timerKey,
                            ["operation"] = "OnDurationCleanupElapsed"
                        };
                        string errorMessage = CreateStructuredErrorMessage("OnDurationCleanupElapsed", disposeEx, context);
                        LogStructuredError("OnDurationCleanupElapsed", "Error disposing cleanup timer", context);

                        // Still remove from dictionaries even if disposal failed
                        this.activeTimers.Remove(timerKey);
                        this.timerStates.Remove(timerKey);
                    }
                }
                else
                {
                    Dictionary<string, object> context = new Dictionary<string, object>
                    {
                        ["sourceName"] = sourceName,
                        ["timerKey"] = timerKey,
                        ["operation"] = "OnDurationCleanupElapsed"
                    };
                    LogStructuredWarning("OnDurationCleanupElapsed", $"Cleanup timer not found for source '{sourceName}', may have been already disposed", context);
                }
            }


            // Delete the OBS source using existing method
            Dictionary<string, object> cleanupContext = new Dictionary<string, object>
            {
                ["sourceName"] = sourceName,
                ["timerFound"] = timerFound,
                ["operation"] = "OnDurationCleanupElapsed"
            };
            LogStructuredInfo("OnDurationCleanupElapsed", $"Starting cleanup of OBS source '{sourceName}' after duration expired", cleanupContext);

            bool deleteSuccess = false;
            try
            {
                // Look up sceneItemId from sourceSceneItemIds using sourceName (which is the generatedSourceGuid)
                int sceneItemId = -1;
                lock (this.lockObject)
                {
                    this.sourceSceneItemIds.TryGetValue(sourceName, out sceneItemId);
                }

                if (sceneItemId > 0)
                {
                    deleteSuccess = DeleteOBSSource(sourceName, sceneItemId);

                    // Clean up the sceneItemId from our tracking dictionary after successful deletion
                    if (deleteSuccess)
                    {
                        lock (this.lockObject)
                        {
                            this.sourceSceneItemIds.Remove(sourceName);
                        }
                    }
                }
                else
                {
                    LogExecution(LogLevel.Warning, $"OnDurationCleanupElapsed: Could not find sceneItemId for source '{sourceName}', skipping deletion");
                    deleteSuccess = false;
                }
            }
            catch (Exception deleteEx)
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                    ["operation"] = "OnDurationCleanupElapsed"
                };
                string errorMessage = CreateStructuredErrorMessage("OnDurationCleanupElapsed", deleteEx, context);
                LogStructuredError("OnDurationCleanupElapsed", "Exception occurred during OBS source deletion", context);
                return;
            }

            if (deleteSuccess)
            {
                Dictionary<string, object> successContext = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                    ["timerFound"] = timerFound,
                    ["operation"] = "OnDurationCleanupElapsed"
                };
                LogStructuredInfo("OnDurationCleanupElapsed", $"Successfully cleaned up OBS source '{sourceName}'", successContext);
            }
            else
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                    ["timerFound"] = timerFound,
                    ["operation"] = "OnDurationCleanupElapsed"
                };
                LogStructuredWarning("OnDurationCleanupElapsed", $"Failed to clean up OBS source '{sourceName}' - source may have been already deleted or OBS connection issue", context);
            }
        }
        catch (Exception ex)
        {
            Dictionary<string, object> context = new Dictionary<string, object>
            {
                ["sourceName"] = sourceName,
                ["operation"] = "OnDurationCleanupElapsed"
            };
            string errorMessage = CreateStructuredErrorMessage("OnDurationCleanupElapsed", ex, context);
            LogStructuredError("OnDurationCleanupElapsed", "Unexpected error during cleanup", context);
        }
    }

    /// <summary>
    /// Create a daily recurring timer that fires at a specific time each day
    /// </summary>
    /// <param name="spawn">The spawn to create a timer for</param>
    /// <param name="config">The trigger configuration</param>
    /// <returns>True if timer was created successfully, false otherwise</returns>
    private bool CreateDailyTimer(Spawn spawn, Dictionary<string, object> config)
    {
        try
        {
            if (!config.ContainsKey("time") || !(config["time"] is string timeStr))
            {
                LogExecution(LogLevel.Warning, $"CreateDailyTimer: Missing or invalid 'time' in config for spawn '{spawn.Name}'");
                return false;
            }

            if (!TimeSpan.TryParse(timeStr, out TimeSpan targetTime))
            {
                LogExecution(LogLevel.Warning, $"CreateDailyTimer: Invalid time format '{timeStr}' for spawn '{spawn.Name}'");
                return false;
            }

            // Calculate delay until next occurrence
            DateTime now = DateTime.Now;
            DateTime nextOccurrence = now.Date.Add(targetTime);
            if (nextOccurrence <= now)
            {
                nextOccurrence = nextOccurrence.AddDays(1);
            }

            double delayMs = (nextOccurrence - now).TotalMilliseconds;
            System.Timers.Timer timer = new System.Timers.Timer(delayMs);
            timer.AutoReset = true;

            // Set up recurring behavior - after first fire, reset to 24-hour interval
            timer.Elapsed += (sender, e) => OnRecurringTimerElapsed(spawn, "dailyAt", () =>
            {
                // Reset timer to 24-hour interval after first fire
                timer.Interval = TimeSpan.FromDays(1).TotalMilliseconds;
                LogExecution(LogLevel.Info, $"CreateDailyTimer: Reset timer interval to 24 hours for spawn '{spawn.Name}'");
            });

            lock (this.lockObject)
            {
                this.activeTimers[spawn.Id] = timer;
                this.timerStates[spawn.Id] = false; // false = active
            }

            timer.Start();
            LogExecution(LogLevel.Info, $"CreateDailyTimer: Created daily timer for spawn '{spawn.Name}' to fire at {targetTime} daily (first fire in {TimeSpan.FromMilliseconds(delayMs).TotalMinutes:F1} minutes)");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"CreateDailyTimer: Error creating timer for spawn '{spawn.Name}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Handle daylight saving time transitions for recurring timers
    /// </summary>
    /// <param name="spawn">The spawn to check</param>
    /// <param name="triggerType">The type of timer trigger</param>
    /// <param name="timer">The timer to potentially reset</param>
    private void HandleDaylightSavingTimeTransition(Spawn spawn, string triggerType, System.Timers.Timer timer)
    {
        try
        {
            // Check if we're in a DST transition period (first Sunday of November or second Sunday of March)
            DateTime now = DateTime.Now;
            bool isDstTransition = IsDaylightSavingTimeTransition(now);

            if (isDstTransition)
            {
                LogExecution(LogLevel.Info, $"HandleDaylightSavingTimeTransition: DST transition detected for spawn '{spawn.Name}', recalculating timer");

                // Recalculate the next occurrence to account for DST changes
                Dictionary<string, object> config = spawn.Trigger?.Config;
                if (config != null)
                {
                    switch (triggerType)
                    {
                        case "dailyAt":
                            if (config.ContainsKey("time") && config["time"] is string timeStr &&
                                TimeSpan.TryParse(timeStr, out TimeSpan targetTime))
                            {
                                DateTime nextOccurrence = now.Date.Add(targetTime);
                                if (nextOccurrence <= now)
                                {
                                    nextOccurrence = nextOccurrence.AddDays(1);
                                }
                                timer.Interval = (nextOccurrence - now).TotalMilliseconds;
                            }
                            break;

                        case "weeklyAt":
                            if (config.ContainsKey("time") && config["time"] is string weeklyTimeStr &&
                                TimeSpan.TryParse(weeklyTimeStr, out TimeSpan weeklyTargetTime) &&
                                config.ContainsKey("daysOfWeek") && config["daysOfWeek"] is List<object> daysList)
                            {
                                List<DayOfWeek> daysOfWeek = new List<DayOfWeek>();
                                foreach (object day in daysList)
                                {
                                    if (day is string dayStr && Enum.TryParse(dayStr, true, out DayOfWeek dayOfWeek))
                                    {
                                        daysOfWeek.Add(dayOfWeek);
                                    }
                                }
                                DateTime nextOccurrence = GetNextWeeklyOccurrence(now, daysOfWeek, weeklyTargetTime);
                                timer.Interval = (nextOccurrence - now).TotalMilliseconds;
                            }
                            break;

                        case "monthlyOn":
                            if (config.ContainsKey("time") && config["time"] is string monthlyTimeStr &&
                                TimeSpan.TryParse(monthlyTimeStr, out TimeSpan monthlyTargetTime) &&
                                config.ContainsKey("daysOfMonth") && config["daysOfMonth"] is List<object> monthlyDaysList)
                            {
                                List<int> daysOfMonth = new List<int>();
                                foreach (object day in monthlyDaysList)
                                {
                                    if (int.TryParse(day.ToString(), out int dayInt))
                                    {
                                        if (dayInt >= 1 && dayInt <= 31)
                                        {
                                            daysOfMonth.Add(dayInt);
                                        }
                                    }
                                }
                                DateTime nextOccurrence = GetNextMonthlyOccurrence(now, daysOfMonth, monthlyTargetTime);
                                timer.Interval = (nextOccurrence - now).TotalMilliseconds;
                            }
                            break;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"HandleDaylightSavingTimeTransition: Error handling DST transition for spawn '{spawn.Name}': {ex.Message}");
        }
    }

    /// <summary>
    /// Check if the current date is during a daylight saving time transition
    /// </summary>
    /// <param name="date">The date to check</param>
    /// <returns>True if the date is during a DST transition</returns>
    private bool IsDaylightSavingTimeTransition(DateTime date)
    {
        try
        {
            // Check if we're in the week of DST transitions
            // Spring forward: Second Sunday of March
            // Fall back: First Sunday of November

            // Check for spring forward (second Sunday of March)
            if (date.Month == 3)
            {
                DateTime firstSunday = new DateTime(date.Year, 3, 1);
                while (firstSunday.DayOfWeek != DayOfWeek.Sunday)
                {
                    firstSunday = firstSunday.AddDays(1);
                }
                DateTime secondSunday = firstSunday.AddDays(7);
                return date.Date >= secondSunday.AddDays(-1) && date.Date <= secondSunday.AddDays(1);
            }

            // Check for fall back (first Sunday of November)
            if (date.Month == 11)
            {
                DateTime firstSunday = new DateTime(date.Year, 11, 1);
                while (firstSunday.DayOfWeek != DayOfWeek.Sunday)
                {
                    firstSunday = firstSunday.AddDays(1);
                }
                return date.Date >= firstSunday.AddDays(-1) && date.Date <= firstSunday.AddDays(1);
            }

            return false;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"IsDaylightSavingTimeTransition: Error checking DST transition: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Handle recurring timer elapsed events - executes spawns when recurring timers fire
    /// </summary>
    /// <param name="spawn">The spawn to execute</param>
    /// <param name="triggerType">The type of timer trigger</param>
    /// <param name="intervalResetAction">Action to reset timer interval after first fire</param>
    private void OnRecurringTimerElapsed(Spawn spawn, string triggerType, Action intervalResetAction)
    {
        try
        {
            // Basic safety checks
            if (spawn == null)
            {
                LogExecution(LogLevel.Warning, "OnRecurringTimerElapsed: Spawn is null, skipping execution");
                return;
            }

            if (string.IsNullOrWhiteSpace(spawn.Id))
            {
                LogExecution(LogLevel.Warning, "OnRecurringTimerElapsed: Spawn ID is null or empty, skipping execution");
                return;
            }

            // Thread safety - access shared state with lock
            lock (this.lockObject)
            {
                // Validate spawn is still enabled and configuration hasn't changed
                if (!IsSpawnStillValid(spawn))
                {
                    LogExecution(LogLevel.Info, $"OnRecurringTimerElapsed: Spawn {spawn.Name} is no longer valid, skipping");
                    return;
                }

                // Apply time-based filtering
                if (!ShouldExecuteAtCurrentTime(spawn, triggerType))
                {
                    LogExecution(LogLevel.Info, $"OnRecurringTimerElapsed: Time-based filtering prevented execution for spawn '{spawn.Name}' at {DateTime.Now:HH:mm:ss}");
                    return; // Not the right time for this trigger
                }

                // Execute the spawn
                LogExecution(LogLevel.Info, $"OnRecurringTimerElapsed: Executing recurring spawn '{spawn.Name}' from {triggerType} timer");
                ExecuteSpawnFromTimer(spawn, triggerType);

                // Reset timer interval for recurring behavior
                try
                {
                    intervalResetAction?.Invoke();
                }
                catch (Exception resetEx)
                {
                    LogExecution(LogLevel.Error, $"OnRecurringTimerElapsed: Error resetting timer interval for spawn '{spawn.Name}': {resetEx.Message}");
                }

                // Handle DST transitions for recurring timers
                try
                {
                    if (this.activeTimers.ContainsKey(spawn.Id) && this.activeTimers[spawn.Id] is System.Timers.Timer timer)
                    {
                        HandleDaylightSavingTimeTransition(spawn, triggerType, timer);
                    }
                }
                catch (Exception dstEx)
                {
                    LogExecution(LogLevel.Error, $"OnRecurringTimerElapsed: Error handling DST transition for spawn '{spawn.Name}': {dstEx.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"OnRecurringTimerElapsed: Error executing recurring timer for spawn {spawn?.Name ?? "unknown"}: {ex.Message}");
        }
    }

    /// <summary>
    /// Create a weekly recurring timer that fires at a specific time on specific days
    /// </summary>
    /// <param name="spawn">The spawn to create a timer for</param>
    /// <param name="config">The trigger configuration</param>
    /// <returns>True if timer was created successfully, false otherwise</returns>
    private bool CreateWeeklyTimer(Spawn spawn, Dictionary<string, object> config)
    {
        try
        {
            if (!config.ContainsKey("time") || !(config["time"] is string timeStr) ||
                !config.ContainsKey("daysOfWeek") || !(config["daysOfWeek"] is List<object> daysList))
            {
                LogExecution(LogLevel.Warning, $"CreateWeeklyTimer: Missing or invalid 'time' or 'daysOfWeek' in config for spawn '{spawn.Name}'");
                return false;
            }

            if (!TimeSpan.TryParse(timeStr, out TimeSpan targetTime))
            {
                LogExecution(LogLevel.Warning, $"CreateWeeklyTimer: Invalid time format '{timeStr}' for spawn '{spawn.Name}'");
                return false;
            }

            List<DayOfWeek> daysOfWeek = new List<DayOfWeek>();
            foreach (object day in daysList)
            {
                if (day is string dayStr && Enum.TryParse(dayStr, true, out DayOfWeek dayOfWeek))
                {
                    daysOfWeek.Add(dayOfWeek);
                }
            }

            if (daysOfWeek.Count == 0)
            {
                LogExecution(LogLevel.Warning, $"CreateWeeklyTimer: No valid days of week specified for spawn '{spawn.Name}'");
                return false;
            }

            // Calculate delay until next occurrence
            DateTime now = DateTime.Now;
            DateTime nextOccurrence = GetNextWeeklyOccurrence(now, daysOfWeek, targetTime);

            double delayMs = (nextOccurrence - now).TotalMilliseconds;
            System.Timers.Timer timer = new System.Timers.Timer(delayMs);
            timer.AutoReset = true;

            // Set up recurring behavior - after first fire, reset to 7-day interval
            timer.Elapsed += (sender, e) => OnRecurringTimerElapsed(spawn, "weeklyAt", () =>
            {
                // Reset timer to 7-day interval after first fire
                timer.Interval = TimeSpan.FromDays(7).TotalMilliseconds;
                LogExecution(LogLevel.Info, $"CreateWeeklyTimer: Reset timer interval to 7 days for spawn '{spawn.Name}'");
            });

            lock (this.lockObject)
            {
                this.activeTimers[spawn.Id] = timer;
                this.timerStates[spawn.Id] = false; // false = active
            }

            timer.Start();
            LogExecution(LogLevel.Info, $"CreateWeeklyTimer: Created weekly timer for spawn '{spawn.Name}' to fire on {string.Join(", ", daysOfWeek)} at {targetTime} (first fire in {TimeSpan.FromMilliseconds(delayMs).TotalHours:F1} hours)");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"CreateWeeklyTimer: Error creating timer for spawn '{spawn.Name}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Create a monthly recurring timer that fires on specific days of the month
    /// </summary>
    /// <param name="spawn">The spawn to create a timer for</param>
    /// <param name="config">The trigger configuration</param>
    /// <returns>True if timer was created successfully, false otherwise</returns>
    private bool CreateMonthlyTimer(Spawn spawn, Dictionary<string, object> config)
    {
        try
        {
            if (!config.ContainsKey("time") || !(config["time"] is string timeStr) ||
                !config.ContainsKey("daysOfMonth") || !(config["daysOfMonth"] is List<object> daysList))
            {
                LogExecution(LogLevel.Warning, $"CreateMonthlyTimer: Missing or invalid 'time' or 'daysOfMonth' in config for spawn '{spawn.Name}'");
                return false;
            }

            if (!TimeSpan.TryParse(timeStr, out TimeSpan targetTime))
            {
                LogExecution(LogLevel.Warning, $"CreateMonthlyTimer: Invalid time format '{timeStr}' for spawn '{spawn.Name}'");
                return false;
            }

            List<int> daysOfMonth = new List<int>();
            foreach (object day in daysList)
            {
                // Use int.TryParse for days (1-31 range)
                if (!int.TryParse(day.ToString(), out int dayInt))
                {
                    continue; // Skip invalid values
                }

                if (dayInt >= 1 && dayInt <= 31)
                {
                    daysOfMonth.Add(dayInt);
                }
            }

            if (daysOfMonth.Count == 0)
            {
                LogExecution(LogLevel.Warning, $"CreateMonthlyTimer: No valid days of month specified for spawn '{spawn.Name}'");
                return false;
            }

            // Calculate delay until next occurrence
            DateTime now = DateTime.Now;
            DateTime nextOccurrence = GetNextMonthlyOccurrence(now, daysOfMonth, targetTime);

            double delayMs = (nextOccurrence - now).TotalMilliseconds;
            System.Timers.Timer timer = new System.Timers.Timer(delayMs);
            timer.AutoReset = true;

            // Set up recurring behavior - after first fire, reset to monthly interval
            timer.Elapsed += (sender, e) => OnRecurringTimerElapsed(spawn, "monthlyOn", () =>
            {
                // Reset timer to monthly interval after first fire (approximately 30 days)
                timer.Interval = TimeSpan.FromDays(30).TotalMilliseconds;
                LogExecution(LogLevel.Info, $"CreateMonthlyTimer: Reset timer interval to 30 days for spawn '{spawn.Name}'");
            });

            lock (this.lockObject)
            {
                this.activeTimers[spawn.Id] = timer;
                this.timerStates[spawn.Id] = false; // false = active
            }

            timer.Start();
            LogExecution(LogLevel.Info, $"CreateMonthlyTimer: Created monthly timer for spawn '{spawn.Name}' to fire on days {string.Join(", ", daysOfMonth)} at {targetTime} (first fire in {TimeSpan.FromMilliseconds(delayMs).TotalDays:F1} days)");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"CreateMonthlyTimer: Error creating timer for spawn '{spawn.Name}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Create an interval timer that fires every N minutes
    /// </summary>
    /// <param name="spawn">The spawn to create a timer for</param>
    /// <param name="config">The trigger configuration</param>
    /// <returns>True if timer was created successfully, false otherwise</returns>
    private bool CreateIntervalTimer(Spawn spawn, Dictionary<string, object> config)
    {
        try
        {
            // Validate configuration first
            if (!ValidateIntervalTimerConfig(spawn, "everyNMinutes", config))
            {
                return false;
            }

            // Use long.TryParse for safety (intervalMinutes can be large values)
            if (!long.TryParse(config["intervalMinutes"].ToString(), out long intervalMinutesLong))
            {
                LogExecution(LogLevel.Error, $"CreateIntervalTimer: Invalid 'intervalMinutes' value '{config["intervalMinutes"]}' for spawn '{spawn.Name}' - must be a valid number");
                return false;
            }
            int intervalMinutes = (int)intervalMinutesLong;

            if (intervalMinutes > 1440) // More than 24 hours
            {
                LogExecution(LogLevel.Warning, $"CreateIntervalTimer: Interval {intervalMinutes} minutes is very large for spawn '{spawn.Name}' - consider using daily timer instead");
            }

            if (intervalMinutes < 1) // Less than 1 minute
            {
                LogExecution(LogLevel.Warning, $"CreateIntervalTimer: Interval {intervalMinutes} minutes is very small for spawn '{spawn.Name}' - minimum recommended is 1 minute");
            }

            double intervalMs = intervalMinutes * 60 * 1000; // Convert to milliseconds

            // Ensure interval is within reasonable bounds
            if (intervalMs > int.MaxValue)
            {
                LogExecution(LogLevel.Warning, $"CreateIntervalTimer: Interval {intervalMs}ms exceeds maximum for spawn '{spawn.Name}', capping to {int.MaxValue}ms");
                intervalMs = int.MaxValue;
            }

            System.Timers.Timer timer = new System.Timers.Timer(intervalMs);
            timer.AutoReset = true;

            // Use dedicated interval timer callback
            timer.Elapsed += (sender, e) => OnIntervalTimerElapsed(spawn, "everyNMinutes");

            lock (this.lockObject)
            {
                this.activeTimers[spawn.Id] = timer;
                this.timerStates[spawn.Id] = false; // false = active
            }

            timer.Start();
            LogExecution(LogLevel.Info, $"CreateIntervalTimer: Created interval timer for spawn '{spawn.Name}' to fire every {intervalMinutes} minutes ({intervalMs}ms interval)");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"CreateIntervalTimer: Error creating timer for spawn '{spawn.Name}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Create a timer that fires at specific minutes of each hour
    /// </summary>
    /// <param name="spawn">The spawn to create a timer for</param>
    /// <param name="config">The trigger configuration</param>
    /// <returns>True if timer was created successfully, false otherwise</returns>
    private bool CreateMinuteOfHourTimer(Spawn spawn, Dictionary<string, object> config)
    {
        try
        {
            // Validate configuration first
            if (!ValidateIntervalTimerConfig(spawn, "minuteOfHour", config))
            {
                return false;
            }

            List<object> minutesList = (List<object>)config["minutes"];
            List<int> minutes = new List<int>();
            foreach (object minute in minutesList)
            {
                // Use int.TryParse for minutes (0-59 range)
                if (!int.TryParse(minute.ToString(), out int minuteInt))
                {
                    LogExecution(LogLevel.Warning, $"CreateMinuteOfHourTimer: Invalid minute value '{minute}' for spawn '{spawn.Name}' - must be a valid number");
                    continue;
                }

                if (minuteInt >= 0 && minuteInt <= 59)
                {
                    minutes.Add(minuteInt);
                }
                else
                {
                    LogExecution(LogLevel.Warning, $"CreateMinuteOfHourTimer: Invalid minute value '{minuteInt}' for spawn '{spawn.Name}' - must be 0-59");
                }
            }

            // Remove duplicates and sort for better logging
            minutes = minutes.Distinct().OrderBy(m => m).ToList();

            // Calculate delay until next occurrence
            DateTime now = DateTime.Now;
            DateTime nextOccurrence = GetNextMinuteOfHourOccurrence(now, minutes);

            double delayMs = (nextOccurrence - now).TotalMilliseconds;

            // Ensure delay is reasonable
            if (delayMs < 0)
            {
                LogExecution(LogLevel.Warning, $"CreateMinuteOfHourTimer: Calculated delay is negative for spawn '{spawn.Name}', using 1 minute delay");
                delayMs = 60000; // 1 minute
            }

            System.Timers.Timer timer = new System.Timers.Timer(delayMs);
            timer.AutoReset = true;

            // Use dedicated interval timer callback with minute filtering
            timer.Elapsed += (sender, e) => OnIntervalTimerElapsed(spawn, "minuteOfHour");

            lock (this.lockObject)
            {
                this.activeTimers[spawn.Id] = timer;
                this.timerStates[spawn.Id] = false; // false = active
            }

            timer.Start();
            LogExecution(LogLevel.Info, $"CreateMinuteOfHourTimer: Created minute-of-hour timer for spawn '{spawn.Name}' to fire at minutes {string.Join(", ", minutes)} (first fire in {TimeSpan.FromMilliseconds(delayMs).TotalMinutes:F1} minutes)");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"CreateMinuteOfHourTimer: Error creating timer for spawn '{spawn.Name}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Validate interval timer configuration
    /// </summary>
    /// <param name="spawn">The spawn to validate</param>
    /// <param name="triggerType">The type of timer trigger</param>
    /// <param name="config">The trigger configuration</param>
    /// <returns>True if configuration is valid, false otherwise</returns>
    private bool ValidateIntervalTimerConfig(Spawn spawn, string triggerType, Dictionary<string, object> config)
    {
        try
        {
            switch (triggerType)
            {
                case "everyNMinutes":
                    if (!config.ContainsKey("intervalMinutes"))
                    {
                        LogExecution(LogLevel.Warning, $"ValidateIntervalTimerConfig: Missing 'intervalMinutes' for spawn '{spawn.Name}'");
                        return false;
                    }

                    // Use long.TryParse for safety (intervalMinutes can be large values)
                    if (!long.TryParse(config["intervalMinutes"].ToString(), out long intervalMinutesLong))
                    {
                        LogExecution(LogLevel.Warning, $"ValidateIntervalTimerConfig: Invalid 'intervalMinutes' value '{config["intervalMinutes"]}' for spawn '{spawn.Name}' - must be a valid number");
                        return false;
                    }
                    int intervalMinutes = (int)intervalMinutesLong;

                    if (intervalMinutes <= 0)
                    {
                        LogExecution(LogLevel.Warning, $"ValidateIntervalTimerConfig: Invalid interval {intervalMinutes} for spawn '{spawn.Name}' - must be > 0");
                        return false;
                    }

                    if (intervalMinutes > 10080) // More than a week
                    {
                        LogExecution(LogLevel.Warning, $"ValidateIntervalTimerConfig: Very large interval {intervalMinutes} minutes for spawn '{spawn.Name}' - consider using daily/weekly timer");
                    }

                    return true;

                case "minuteOfHour":
                    if (!config.ContainsKey("minutes") || !(config["minutes"] is List<object> minutesList))
                    {
                        LogExecution(LogLevel.Warning, $"ValidateIntervalTimerConfig: Missing 'minutes' for spawn '{spawn.Name}'");
                        return false;
                    }

                    if (minutesList.Count == 0)
                    {
                        LogExecution(LogLevel.Warning, $"ValidateIntervalTimerConfig: Empty minutes list for spawn '{spawn.Name}'");
                        return false;
                    }

                    int validMinutes = 0;
                    foreach (object minute in minutesList)
                    {
                        // Use int.TryParse for minutes (0-59 range)
                        if (!int.TryParse(minute.ToString(), out int minuteInt))
                        {
                            continue; // Skip invalid values
                        }

                        if (minuteInt >= 0 && minuteInt <= 59)
                        {
                            validMinutes++;
                        }
                    }

                    if (validMinutes == 0)
                    {
                        LogExecution(LogLevel.Warning, $"ValidateIntervalTimerConfig: No valid minutes (0-59) for spawn '{spawn.Name}'");
                        return false;
                    }

                    return true;

                default:
                    LogExecution(LogLevel.Warning, $"ValidateIntervalTimerConfig: Unknown trigger type '{triggerType}' for spawn '{spawn.Name}'");
                    return false;
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ValidateIntervalTimerConfig: Error validating config for spawn '{spawn.Name}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Handle interval timer elapsed events - executes spawns when interval timers fire
    /// </summary>
    /// <param name="spawn">The spawn to execute</param>
    /// <param name="triggerType">The type of timer trigger</param>
    private void OnIntervalTimerElapsed(Spawn spawn, string triggerType)
    {
        try
        {
            // Basic safety checks
            if (spawn == null)
            {
                LogExecution(LogLevel.Warning, "OnIntervalTimerElapsed: Spawn is null, skipping execution");
                return;
            }

            if (string.IsNullOrWhiteSpace(spawn.Id))
            {
                LogExecution(LogLevel.Warning, "OnIntervalTimerElapsed: Spawn ID is null or empty, skipping execution");
                return;
            }

            // Thread safety - access shared state with lock
            lock (this.lockObject)
            {
                // Validate spawn is still enabled and configuration hasn't changed
                if (!IsSpawnStillValid(spawn))
                {
                    LogExecution(LogLevel.Info, $"OnIntervalTimerElapsed: Spawn {spawn.Name} is no longer valid, skipping");
                    return;
                }

                // Apply time-based filtering for interval timers
                if (!ShouldExecuteAtCurrentTime(spawn, triggerType))
                {
                    LogExecution(LogLevel.Info, $"OnIntervalTimerElapsed: Time-based filtering prevented execution for spawn '{spawn.Name}' at {DateTime.Now:HH:mm:ss}");
                    return; // Not the right time for this trigger
                }

                // Execute the spawn
                LogExecution(LogLevel.Info, $"OnIntervalTimerElapsed: Executing interval spawn '{spawn.Name}' from {triggerType} timer");
                ExecuteSpawnFromTimer(spawn, triggerType);

                // For minuteOfHour timers, reset to 1-minute interval for continuous checking
                if (triggerType == "minuteOfHour")
                {
                    try
                    {
                        if (this.activeTimers.ContainsKey(spawn.Id) && this.activeTimers[spawn.Id] is System.Timers.Timer timer)
                        {
                            timer.Interval = 60000; // 1 minute interval for continuous minute checking
                            LogExecution(LogLevel.Info, $"OnIntervalTimerElapsed: Reset minute-of-hour timer to 1-minute interval for spawn '{spawn.Name}'");
                        }
                    }
                    catch (Exception intervalEx)
                    {
                        LogExecution(LogLevel.Error, $"OnIntervalTimerElapsed: Error resetting timer interval for spawn '{spawn.Name}': {intervalEx.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"OnIntervalTimerElapsed: Error executing interval timer for spawn {spawn?.Name ?? "unknown"}: {ex.Message}");
        }
    }

    /// <summary>
    /// Calculate the next weekly occurrence based on days of week and time
    /// </summary>
    /// <param name="now">Current time</param>
    /// <param name="daysOfWeek">List of days of the week</param>
    /// <param name="targetTime">Target time of day</param>
    /// <returns>Next occurrence DateTime</returns>
    private DateTime GetNextWeeklyOccurrence(DateTime now, List<DayOfWeek> daysOfWeek, TimeSpan targetTime)
    {
        // Start from today and look for the next occurrence
        for (int i = 0; i < 7; i++)
        {
            DateTime checkDate = now.Date.AddDays(i);
            if (!daysOfWeek.Contains(checkDate.DayOfWeek))
                continue;
            DateTime occurrence = checkDate.Add(targetTime);
            if (occurrence > now)
            {
                return occurrence;
            }
        }

        // If no occurrence found in the next 7 days, look at the following week
        for (int i = 7; i < 14; i++)
        {
            DateTime checkDate = now.Date.AddDays(i);
            if (daysOfWeek.Contains(checkDate.DayOfWeek))
            {
                return checkDate.Add(targetTime);
            }
        }

        // Fallback (should never reach here)
        return now.AddDays(1);
    }

    /// <summary>
    /// Calculate the next monthly occurrence based on days of month and time
    /// </summary>
    /// <param name="now">Current time</param>
    /// <param name="daysOfMonth">List of days of the month</param>
    /// <param name="targetTime">Target time of day</param>
    /// <returns>Next occurrence DateTime</returns>
    private DateTime GetNextMonthlyOccurrence(DateTime now, List<int> daysOfMonth, TimeSpan targetTime)
    {
        // Start from current month and look for the next occurrence
        for (int monthOffset = 0; monthOffset < 12; monthOffset++)
        {
            DateTime checkMonth = now.Date.AddMonths(monthOffset);
            int daysInMonth = DateTime.DaysInMonth(checkMonth.Year, checkMonth.Month);

            foreach (int day in daysOfMonth.OrderBy(d => d))
            {
                if (day <= daysInMonth)
                {
                    DateTime occurrence = new DateTime(checkMonth.Year, checkMonth.Month, day).Add(targetTime);
                    if (occurrence > now)
                    {
                        return occurrence;
                    }
                }
            }
        }

        // Fallback (should never reach here)
        return now.AddMonths(1);
    }

    /// <summary>
    /// Calculate the next minute-of-hour occurrence
    /// </summary>
    /// <param name="now">Current time</param>
    /// <param name="minutes">List of minutes (0-59)</param>
    /// <returns>Next occurrence DateTime</returns>
    private DateTime GetNextMinuteOfHourOccurrence(DateTime now, List<int> minutes)
    {
        // Check current hour first
        foreach (int minute in minutes.OrderBy(m => m))
        {
            DateTime occurrence = now.Date.AddHours(now.Hour).AddMinutes(minute);
            if (occurrence > now)
            {
                return occurrence;
            }
        }

        // If no occurrence in current hour, look at next hour
        DateTime nextHour = now.Date.AddHours(now.Hour + 1);
        int nextMinute = minutes.OrderBy(m => m).First();
        return nextHour.AddMinutes(nextMinute);
    }

    /// <summary>
    /// Handle timer elapsed events - executes spawns when timers fire
    /// </summary>
    /// <param name="spawn">The spawn to execute</param>
    /// <param name="triggerType">The type of timer trigger</param>
    private void OnTimerElapsed(Spawn spawn, string triggerType)
    {
        try
        {
            // Thread safety - access shared state with lock
            lock (this.lockObject)
            {
                // Validate spawn is still enabled and configuration hasn't changed
                if (!IsSpawnStillValid(spawn))
                {
                    LogExecution(LogLevel.Info, $"OnTimerElapsed: Spawn {spawn.Name} is no longer valid, skipping");
                    return;
                }

                // Apply time-based filtering
                if (!ShouldExecuteAtCurrentTime(spawn, triggerType))
                {
                    return; // Not the right time for this trigger
                }

                // Execute the spawn
                LogExecution(LogLevel.Info, $"OnTimerElapsed: Executing spawn '{spawn.Name}' from {triggerType} timer");
                ExecuteSpawnFromTimer(spawn, triggerType);
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"OnTimerElapsed: Error executing timer for spawn {spawn.Name}: {ex.Message}");
        }
    }

    /// <summary>
    /// Execute a spawn from a timer callback
    /// </summary>
    /// <param name="spawn">The spawn to execute</param>
    /// <param name="triggerType">The type of timer trigger</param>
    private void ExecuteSpawnFromTimer(Spawn spawn, string triggerType)
    {
        try
        {
            // Create execution context for timer-triggered spawn
            Dictionary<string, object> contextData = new Dictionary<string, object>
            {
                ["triggerType"] = $"time.{triggerType}",
                ["executionSource"] = "timer",
                ["timerFiredAt"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            };

            // Execute the spawn using existing execution logic
            bool success = ExecuteSpawn(spawn, $"time.{triggerType}", contextData);

            if (success)
            {
                LogExecution(LogLevel.Info, $"ExecuteSpawnFromTimer: Successfully executed spawn '{spawn.Name}' from {triggerType} timer");
            }
            else
            {
                LogExecution(LogLevel.Warning, $"ExecuteSpawnFromTimer: Failed to execute spawn '{spawn.Name}' from {triggerType} timer");
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ExecuteSpawnFromTimer: Error executing spawn '{spawn.Name}': {ex.Message}");
        }
    }

    /// <summary>
    /// Check if a spawn is still valid (enabled and configuration hasn't changed)
    /// </summary>
    /// <param name="spawn">The spawn to validate</param>
    /// <returns>True if spawn is still valid, false otherwise</returns>
    private bool IsSpawnStillValid(Spawn spawn)
    {
        try
        {
            // Check if configuration has changed
            if (HasConfigurationChanged())
            {
                LogExecution(LogLevel.Info, "IsSpawnStillValid: Configuration changed, spawn may no longer be valid");
                return false;
            }

            // Find the spawn in current configuration
            if (this.cachedConfig?.Profiles == null)
                return false;

            foreach (SpawnProfile profile in this.cachedConfig.Profiles)
            {
                if (profile.Spawns != null)
                {
                    foreach (Spawn currentSpawn in profile.Spawns)
                    {
                        if (currentSpawn.Id == spawn.Id)
                        {
                            return currentSpawn.Enabled && currentSpawn.Trigger?.Type?.StartsWith("time.") == true;
                        }
                    }
                }
            }

            return false; // Spawn not found in current configuration
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"IsSpawnStillValid: Error validating spawn '{spawn.Name}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Check if a spawn should execute at the current time based on its trigger configuration
    /// </summary>
    /// <param name="spawn">The spawn to check</param>
    /// <param name="triggerType">The type of timer trigger</param>
    /// <returns>True if spawn should execute now, false otherwise</returns>
    private bool ShouldExecuteAtCurrentTime(Spawn spawn, string triggerType)
    {
        try
        {
            Dictionary<string, object> config = spawn.Trigger?.Config;
            if (config == null)
                return true; // No specific time filtering

            DateTime now = DateTime.Now;

            switch (triggerType)
            {
                case "atDateTime":
                    // One-time timers should always execute when they fire
                    return true;

                case "dailyAt":
                    // Check if current time matches the configured time
                    if (config.ContainsKey("time") && config["time"] is string timeStr &&
                        TimeSpan.TryParse(timeStr, out TimeSpan targetTime))
                    {
                        TimeSpan currentTime = now.TimeOfDay;
                        return Math.Abs((currentTime - targetTime).TotalMinutes) < 1; // Within 1 minute tolerance
                    }
                    return true;

                case "weeklyAt":
                    // Check if current day and time match
                    if (config.ContainsKey("time") && config["time"] is string weeklyTimeStr &&
                        TimeSpan.TryParse(weeklyTimeStr, out TimeSpan weeklyTargetTime) &&
                        config.ContainsKey("daysOfWeek") && config["daysOfWeek"] is List<object> weeklyDaysList)
                    {
                        List<DayOfWeek> daysOfWeek = new List<DayOfWeek>();
                        foreach (object day in weeklyDaysList)
                        {
                            if (day is string dayStr && Enum.TryParse(dayStr, true, out DayOfWeek dayOfWeek))
                            {
                                daysOfWeek.Add(dayOfWeek);
                            }
                        }

                        TimeSpan currentTime = now.TimeOfDay;
                        return daysOfWeek.Contains(now.DayOfWeek) &&
                               Math.Abs((currentTime - weeklyTargetTime).TotalMinutes) < 1;
                    }
                    return true;

                case "monthlyOn":
                    // Check if current day and time match
                    if (config.ContainsKey("time") && config["time"] is string monthlyTimeStr &&
                        TimeSpan.TryParse(monthlyTimeStr, out TimeSpan monthlyTargetTime) &&
                        config.ContainsKey("daysOfMonth") && config["daysOfMonth"] is List<object> monthlyDaysList)
                    {
                        List<int> daysOfMonth = new List<int>();
                        foreach (object day in monthlyDaysList)
                        {
                            if (int.TryParse(day.ToString(), out int dayInt))
                            {
                                if (dayInt >= 1 && dayInt <= 31)
                                {
                                    daysOfMonth.Add(dayInt);
                                }
                            }
                        }

                        TimeSpan currentTime = now.TimeOfDay;
                        return daysOfMonth.Contains(now.Day) &&
                               Math.Abs((currentTime - monthlyTargetTime).TotalMinutes) < 1;
                    }
                    return true;

                case "everyNMinutes":
                    // Interval timers should always execute when they fire
                    return true;

                case "minuteOfHour":
                    // Check if current minute matches configured minutes
                    if (config.ContainsKey("minutes") && config["minutes"] is List<object> minutesList)
                    {
                        List<int> minutes = new List<int>();
                        foreach (object minute in minutesList)
                        {
                            if (int.TryParse(minute.ToString(), out int minuteInt))
                            {
                                if (minuteInt >= 0 && minuteInt <= 59)
                                {
                                    minutes.Add(minuteInt);
                                }
                            }
                        }
                        return minutes.Contains(now.Minute);
                    }
                    return true;

                default:
                    return true; // Unknown trigger type, allow execution
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ShouldExecuteAtCurrentTime: Error checking time for spawn '{spawn.Name}': {ex.Message}");
            return true; // On error, allow execution
        }
    }

    /// <summary>
    /// Clean up all active timers
    /// </summary>
    private void CleanupAllTimers()
    {
        try
        {
            lock (this.lockObject)
            {
                foreach (IDisposable timer in this.activeTimers.Values)
                {
                    try
                    {
                        // Handle different timer types
                        if (timer is System.Timers.Timer systemTimer)
                        {
                            systemTimer.Stop();
                            systemTimer.Dispose();
                        }
                        else if (timer is OneTimeTimerWrapper oneTimeWrapper)
                        {
                            oneTimeWrapper.Dispose();
                        }
                        else
                        {
                            // Fallback for any other timer types
                            timer?.Dispose();
                        }
                    }
                    catch (Exception ex)
                    {
                        LogExecution(LogLevel.Warning, $"CleanupAllTimers: Error disposing timer: {ex.Message}");
                    }
                }

                this.activeTimers.Clear();
                this.timerStates.Clear();
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"CleanupAllTimers: Error during cleanup: {ex.Message}");
        }
    }

    /// <summary>
    /// Remove a specific timer for a spawn (when spawn is deleted or disabled)
    /// </summary>
    /// <param name="spawnId">The ID of the spawn whose timer should be removed</param>
    /// <returns>True if timer was found and removed, false otherwise</returns>
    private bool RemoveTimerForSpawn(string spawnId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(spawnId))
            {
                LogExecution(LogLevel.Warning, "RemoveTimerForSpawn: Spawn ID is null or empty");
                return false;
            }

            lock (this.lockObject)
            {
                if (!this.activeTimers.ContainsKey(spawnId))
                {
                    LogExecution(LogLevel.Info, $"RemoveTimerForSpawn: No active timer found for spawn ID '{spawnId}'");
                    return false;
                }

                try
                {
                    IDisposable timer = this.activeTimers[spawnId];

                    // Handle different timer types
                    if (timer is System.Timers.Timer systemTimer)
                    {
                        systemTimer.Stop();
                        systemTimer.Dispose();
                        LogExecution(LogLevel.Info, $"RemoveTimerForSpawn: Stopped and disposed System.Timers.Timer for spawn '{spawnId}'");
                    }
                    else if (timer is OneTimeTimerWrapper oneTimeWrapper)
                    {
                        oneTimeWrapper.Dispose();
                        LogExecution(LogLevel.Info, $"RemoveTimerForSpawn: Disposed OneTimeTimerWrapper for spawn '{spawnId}'");
                    }
                    else
                    {
                        timer?.Dispose();
                        LogExecution(LogLevel.Info, $"RemoveTimerForSpawn: Disposed timer for spawn '{spawnId}'");
                    }

                    this.activeTimers.Remove(spawnId);
                    this.timerStates.Remove(spawnId);
                    LogExecution(LogLevel.Info, $"RemoveTimerForSpawn: Successfully removed timer for spawn '{spawnId}'");
                    return true;
                }
                catch (Exception timerEx)
                {
                    LogExecution(LogLevel.Error, $"RemoveTimerForSpawn: Error disposing timer for spawn '{spawnId}': {timerEx.Message}");
                    // Still remove from dictionary even if disposal failed
                    this.activeTimers.Remove(spawnId);
                    return false;
                }
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"RemoveTimerForSpawn: Error removing timer for spawn '{spawnId}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Get comprehensive timer status information for monitoring
    /// </summary>
    /// <returns>Dictionary containing timer status information</returns>
    private Dictionary<string, object> GetTimerStatus()
    {
        try
        {
            lock (this.lockObject)
            {
                Dictionary<string, object> status = new Dictionary<string, object>
                {
                    ["activeTimerCount"] = this.activeTimers.Count,
                    ["timersInitialized"] = this.timersInitialized,
                    ["timersPaused"] = this.timersPaused,
                    ["isShuttingDown"] = this.isShuttingDown,
                    ["activeTimerIds"] = this.activeTimers.Keys.ToList(),
                    ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                };

                // Add timer type breakdown
                Dictionary<string, int> timerTypes = new Dictionary<string, int>();
                int pausedCount = 0;
                int activeCount = 0;

                foreach (KeyValuePair<string, IDisposable> kvp in this.activeTimers)
                {
                    string timerType;
                    if (kvp.Value is System.Timers.Timer)
                    {
                        timerType = "System.Timers.Timer";
                    }
                    else if (kvp.Value is OneTimeTimerWrapper)
                    {
                        timerType = "OneTimeTimerWrapper";
                    }
                    else
                    {
                        timerType = "Unknown";
                    }

                    if (timerTypes.ContainsKey(timerType))
                    {
                        timerTypes[timerType]++;
                    }
                    else
                    {
                        timerTypes[timerType] = 1;
                    }

                    // Count paused vs active timers
                    if (this.timerStates.ContainsKey(kvp.Key) && this.timerStates[kvp.Key])
                    {
                        pausedCount++;
                    }
                    else
                    {
                        activeCount++;
                    }
                }

                status["timerTypeBreakdown"] = timerTypes;
                status["pausedTimerCount"] = pausedCount;
                status["activeTimerCount"] = activeCount;
                status["timerStates"] = new Dictionary<string, bool>(this.timerStates);

                // Add performance statistics if available
                if (this.timerStats.Count > 0)
                {
                    status["performanceStats"] = new Dictionary<string, object>(this.timerStats);
                }

                return status;
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"GetTimerStatus: Error getting timer status: {ex.Message}");
            return new Dictionary<string, object>
            {
                ["error"] = ex.Message,
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            };
        }
    }

    /// <summary>
    /// Pause all active timers
    /// </summary>
    /// <returns>True if operation succeeded, false otherwise</returns>
    private bool PauseAllTimers()
    {
        try
        {
            lock (this.lockObject)
            {
                if (this.timersPaused)
                {
                    LogExecution(LogLevel.Info, "PauseAllTimers: Timers are already paused");
                    return true;
                }

                int pausedCount = 0;
                foreach (KeyValuePair<string, IDisposable> kvp in this.activeTimers.ToList())
                {
                    try
                    {
                        if (kvp.Value is System.Timers.Timer systemTimer)
                        {
                            systemTimer.Stop();
                            this.timerStates[kvp.Key] = true; // true = paused
                            pausedCount++;
                        }
                        else if (kvp.Value is OneTimeTimerWrapper oneTimeWrapper)
                        {
                            // One-time timers can't be paused, just mark as paused in state
                            this.timerStates[kvp.Key] = true;
                            pausedCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        LogExecution(LogLevel.Error, $"PauseAllTimers: Error pausing timer for spawn '{kvp.Key}': {ex.Message}");
                    }
                }

                this.timersPaused = true;
                LogExecution(LogLevel.Info, $"PauseAllTimers: Successfully paused {pausedCount} timers");

                // Update statistics
                UpdateTimerStats("paused_all", null, pausedCount);

                return true;
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"PauseAllTimers: Error pausing timers: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Resume all paused timers
    /// </summary>
    /// <returns>True if operation succeeded, false otherwise</returns>
    private bool ResumeAllTimers()
    {
        try
        {
            lock (this.lockObject)
            {
                if (!this.timersPaused)
                {
                    LogExecution(LogLevel.Info, "ResumeAllTimers: Timers are not paused");
                    return true;
                }

                int resumedCount = 0;
                foreach (KeyValuePair<string, IDisposable> kvp in this.activeTimers.ToList())
                {
                    try
                    {
                        if (kvp.Value is System.Timers.Timer systemTimer)
                        {
                            systemTimer.Start();
                            this.timerStates[kvp.Key] = false; // false = active
                            resumedCount++;
                        }
                        else if (kvp.Value is OneTimeTimerWrapper oneTimeWrapper)
                        {
                            // One-time timers can't be resumed, just mark as active in state
                            this.timerStates[kvp.Key] = false;
                            resumedCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        LogExecution(LogLevel.Error, $"ResumeAllTimers: Error resuming timer for spawn '{kvp.Key}': {ex.Message}");
                    }
                }

                this.timersPaused = false;
                LogExecution(LogLevel.Info, $"ResumeAllTimers: Successfully resumed {resumedCount} timers");

                // Update statistics
                UpdateTimerStats("resumed_all", null, resumedCount);

                return true;
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ResumeAllTimers: Error resuming timers: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Pause a specific timer by spawn ID
    /// </summary>
    /// <param name="spawnId">The spawn ID whose timer should be paused</param>
    /// <returns>True if timer was paused successfully, false otherwise</returns>
    private bool PauseTimerForSpawn(string spawnId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(spawnId))
            {
                LogExecution(LogLevel.Warning, "PauseTimerForSpawn: Spawn ID is null or empty");
                return false;
            }

            lock (this.lockObject)
            {
                if (!this.activeTimers.TryGetValue(spawnId, out IDisposable timer))
                {
                    LogExecution(LogLevel.Warning, $"PauseTimerForSpawn: No active timer found for spawn ID '{spawnId}'");
                    return false;
                }

                try
                {
                    if (timer is System.Timers.Timer systemTimer)
                    {
                        systemTimer.Stop();
                        this.timerStates[spawnId] = true; // true = paused
                        LogExecution(LogLevel.Info, $"PauseTimerForSpawn: Paused timer for spawn '{spawnId}'");
                    }
                    else if (timer is OneTimeTimerWrapper oneTimeWrapper)
                    {
                        // One-time timers can't be paused, just mark as paused in state
                        this.timerStates[spawnId] = true;
                        LogExecution(LogLevel.Info, $"PauseTimerForSpawn: Marked one-time timer as paused for spawn '{spawnId}'");
                    }
                    else
                    {
                        this.timerStates[spawnId] = true;
                        LogExecution(LogLevel.Info, $"PauseTimerForSpawn: Marked timer as paused for spawn '{spawnId}'");
                    }

                    return true;
                }
                catch (Exception timerEx)
                {
                    LogExecution(LogLevel.Error, $"PauseTimerForSpawn: Error pausing timer for spawn '{spawnId}': {timerEx.Message}");
                    return false;
                }
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"PauseTimerForSpawn: Error pausing timer for spawn '{spawnId}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Resume a specific timer by spawn ID
    /// </summary>
    /// <param name="spawnId">The spawn ID whose timer should be resumed</param>
    /// <returns>True if timer was resumed successfully, false otherwise</returns>
    private bool ResumeTimerForSpawn(string spawnId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(spawnId))
            {
                LogExecution(LogLevel.Warning, "ResumeTimerForSpawn: Spawn ID is null or empty");
                return false;
            }

            lock (this.lockObject)
            {
                if (!this.activeTimers.TryGetValue(spawnId, out IDisposable timer))
                {
                    LogExecution(LogLevel.Warning, $"ResumeTimerForSpawn: No active timer found for spawn ID '{spawnId}'");
                    return false;
                }

                try
                {
                    switch (timer)
                    {
                        case System.Timers.Timer systemTimer:
                            systemTimer.Start();
                            this.timerStates[spawnId] = false; // false = active
                            LogExecution(LogLevel.Info, $"ResumeTimerForSpawn: Resumed timer for spawn '{spawnId}'");
                            break;
                        case OneTimeTimerWrapper _:
                            // One-time timers can't be resumed, just mark as active in state
                            this.timerStates[spawnId] = false;
                            LogExecution(LogLevel.Info, $"ResumeTimerForSpawn: Marked one-time timer as active for spawn '{spawnId}'");
                            break;
                        default:
                            this.timerStates[spawnId] = false;
                            LogExecution(LogLevel.Info, $"ResumeTimerForSpawn: Marked timer as active for spawn '{spawnId}'");
                            break;
                    }

                    return true;
                }
                catch (Exception timerEx)
                {
                    LogExecution(LogLevel.Error, $"ResumeTimerForSpawn: Error resuming timer for spawn '{spawnId}': {timerEx.Message}");
                    return false;
                }
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ResumeTimerForSpawn: Error resuming timer for spawn '{spawnId}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Attempt to recover failed timer operations
    /// </summary>
    /// <param name="spawnId">The spawn ID to attempt recovery for</param>
    /// <returns>True if recovery was successful, false otherwise</returns>
    private bool AttemptTimerRecovery(string spawnId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(spawnId))
            {
                LogExecution(LogLevel.Warning, "AttemptTimerRecovery: Spawn ID is null or empty");
                return false;
            }

            if (this.isShuttingDown)
            {
                LogExecution(LogLevel.Info, $"AttemptTimerRecovery: System is shutting down, skipping recovery for spawn '{spawnId}'");
                return false;
            }

            LogExecution(LogLevel.Info, $"AttemptTimerRecovery: Attempting recovery for spawn '{spawnId}'");

            // Find the spawn in the configuration
            Spawn targetSpawn = null;
            foreach (SpawnProfile profile in (this.cachedConfig?.Profiles ?? new List<SpawnProfile>()).Where(profile => profile.Spawns != null))
            {
                targetSpawn = profile.Spawns.FirstOrDefault(s => s.Id == spawnId);
                if (targetSpawn != null) break;
            }

            if (targetSpawn == null)
            {
                LogExecution(LogLevel.Warning, $"AttemptTimerRecovery: Spawn '{spawnId}' not found in configuration, removing from active timers");
                lock (this.lockObject)
                {
                    this.activeTimers.Remove(spawnId);
                    this.timerStates.Remove(spawnId);
                }
                return false;
            }

            // Attempt to recreate the timer
            bool recoverySuccessful = CreateTimerForSpawn(targetSpawn);

            if (recoverySuccessful)
            {
                LogExecution(LogLevel.Info, $"AttemptTimerRecovery: Successfully recovered timer for spawn '{spawnId}'");
            }
            else
            {
                LogExecution(LogLevel.Warning, $"AttemptTimerRecovery: Failed to recover timer for spawn '{spawnId}'");
            }

            return recoverySuccessful;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"AttemptTimerRecovery: Error during recovery for spawn '{spawnId}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Perform health check on all active timers
    /// </summary>
    /// <returns>Dictionary containing health check results</returns>
    private Dictionary<string, object> PerformTimerHealthCheck()
    {
        try
        {
            Dictionary<string, object> healthResults = new Dictionary<string, object>
            {
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                ["totalTimers"] = this.activeTimers.Count,
                ["healthyTimers"] = 0,
                ["unhealthyTimers"] = 0,
                ["recoveryAttempts"] = 0,
            };

            List<string> unhealthyTimers = new List<string>();
            List<string> healthyTimers = new List<string>();

            lock (this.lockObject)
            {
                foreach (KeyValuePair<string, IDisposable> kvp in this.activeTimers.ToList())
                {
                    try
                    {
                        switch (kvp.Value)
                        {
                            // Basic health check - verify timer is still valid
                            // Check if timer is still enabled (basic health check)
                            case System.Timers.Timer systemTimer when systemTimer.Enabled:
                                healthyTimers.Add(kvp.Key);
                                break;
                            case System.Timers.Timer _:
                                unhealthyTimers.Add(kvp.Key);
                                break;
                            case OneTimeTimerWrapper _:
                                // One-time timers are considered healthy if they exist
                                healthyTimers.Add(kvp.Key);
                                break;
                            default:
                                // Unknown timer type - consider unhealthy
                                unhealthyTimers.Add(kvp.Key);
                                break;
                        }
                    }
                    catch (Exception ex)
                    {
                        LogExecution(LogLevel.Error, $"PerformTimerHealthCheck: Error checking timer '{kvp.Key}': {ex.Message}");
                        unhealthyTimers.Add(kvp.Key);
                    }
                }
            }

            healthResults["healthyTimers"] = healthyTimers.Count;
            healthResults["unhealthyTimers"] = unhealthyTimers.Count;
            healthResults["healthyTimerIds"] = healthyTimers;
            healthResults["unhealthyTimerIds"] = unhealthyTimers;

            // Attempt recovery for unhealthy timers
            foreach (string unhealthyTimerId in unhealthyTimers)
            {
                try
                {
                    bool recoverySuccessful = AttemptTimerRecovery(unhealthyTimerId);
                    if (recoverySuccessful)
                    {
                        healthResults["recoveryAttempts"] = (int)healthResults["recoveryAttempts"] + 1;
                    }
                }
                catch (Exception ex)
                {
                    LogExecution(LogLevel.Error, $"PerformTimerHealthCheck: Error during recovery for timer '{unhealthyTimerId}': {ex.Message}");
                }
            }

            LogExecution(LogLevel.Info, $"PerformTimerHealthCheck: Health check completed - {healthyTimers.Count} healthy, {unhealthyTimers.Count} unhealthy timers");
            return healthResults;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"PerformTimerHealthCheck: Error during health check: {ex.Message}");
            return new Dictionary<string, object>
            {
                ["error"] = ex.Message,
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            };
        }
    }

    /// <summary>
    /// Update timer performance statistics
    /// </summary>
    /// <param name="operation">The operation performed (created, paused, resumed, disposed, etc.)</param>
    /// <param name="spawnId">The spawn ID (optional)</param>
    /// <param name="executionTimeMs">Execution time in milliseconds (optional)</param>
    private void UpdateTimerStats(string operation, string spawnId = null, long executionTimeMs = 0)
    {
        try
        {
            lock (this.lockObject)
            {
                string timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

                // Update operation counts
                string operationKey = $"operation_{operation}";
                if (this.timerStats.ContainsKey(operationKey))
                {
                    this.timerStats[operationKey] = (int)this.timerStats[operationKey] + 1;
                }
                else
                {
                    this.timerStats[operationKey] = 1;
                }

                // Update last operation timestamp
                this.timerStats[$"last_{operation}"] = timestamp;

                // Update execution time statistics if provided
                if (executionTimeMs > 0)
                {
                    string timeKey = $"avgTime_{operation}";
                    string countKey = $"timeCount_{operation}";

                    if (this.timerStats.ContainsKey(timeKey) && this.timerStats.ContainsKey(countKey))
                    {
                        int currentCount = (int)this.timerStats[countKey];
                        double currentAvg = (double)this.timerStats[timeKey];
                        double newAvg = ((currentAvg * currentCount) + executionTimeMs) / (currentCount + 1);

                        this.timerStats[timeKey] = newAvg;
                        this.timerStats[countKey] = currentCount + 1;
                    }
                    else
                    {
                        this.timerStats[timeKey] = (double)executionTimeMs;
                        this.timerStats[countKey] = 1;
                    }
                }

                // Update spawn-specific statistics if spawnId provided
                if (!string.IsNullOrWhiteSpace(spawnId))
                {
                    string spawnKey = $"spawn_{spawnId}_{operation}";
                    if (this.timerStats.ContainsKey(spawnKey))
                    {
                        this.timerStats[spawnKey] = (int)this.timerStats[spawnKey] + 1;
                    }
                    else
                    {
                        this.timerStats[spawnKey] = 1;
                    }
                }

                // Update overall statistics
                this.timerStats["lastUpdate"] = timestamp;
                this.timerStats["totalOperations"] = this.timerStats.Keys.Count(k => k.StartsWith("operation_"));
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"UpdateTimerStats: Error updating timer statistics: {ex.Message}");
        }
    }


    /// <summary>
    /// Handle configuration update by invalidating cache and recreating timers
    /// This method should be called whenever the configuration is updated
    /// </summary>
    /// <returns>True if configuration update was handled successfully, false otherwise</returns>
    private bool HandleConfigurationUpdate()
    {
        try
        {
            LogExecution(LogLevel.Info, "HandleConfigurationUpdate: Starting configuration update process");

            // Invalidate the configuration cache to force fresh load
            InvalidateConfigCache();

            // Reload configuration with retry logic
            if (!LoadMediaSpawnerConfigWithRetry())
            {
                LogExecution(LogLevel.Error, "HandleConfigurationUpdate: Failed to reload configuration");
                return false;
            }

            // Clean up existing timers
            CleanupAllTimers();

            // Recreate timers with new configuration
            InitializeTimers();

            LogExecution(LogLevel.Info, "HandleConfigurationUpdate: Configuration update completed successfully");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"HandleConfigurationUpdate: Error during configuration update: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Check if the configuration has changed since last load
    /// </summary>
    /// <returns>True if configuration has changed, false otherwise</returns>
    private bool HasConfigurationChanged()
    {
        try
        {
            string currentSha = CPH.GetGlobalVar<string>(this.mediaSpawnerShaVarName);
            return this.cachedConfigSha != currentSha;
        }
        catch
        {
            return true; // Assume changed if we can't check
        }
    }

    #endregion

    #region Helper Methods for Execute()

    /// <summary>
    /// Find spawns by trigger type across all profiles
    /// </summary>
    /// <param name="triggerType">The trigger type to search for</param>
    /// <returns>List of matching spawns</returns>
    private List<Spawn> FindSpawnsByTriggerType(string triggerType)
    {
        List<Spawn> matchingSpawns = new List<Spawn>();

        if (this.cachedConfig?.Profiles == null)
            return matchingSpawns;

        foreach (SpawnProfile profile in this.cachedConfig.Profiles)
        {
            if (profile.Spawns == null)
                continue;

            matchingSpawns.AddRange(profile.Spawns.Where(spawn => spawn.Enabled && spawn.Trigger?.Type == triggerType));
        }

        return matchingSpawns;
    }

    /// <summary>
    /// Find a specific spawn by ID across all profiles
    /// </summary>
    /// <param name="spawnId">The spawn ID to search for</param>
    /// <returns>The spawn if found, null otherwise</returns>
    private Spawn FindSpawnById(string spawnId)
    {
        if (this.cachedConfig?.Profiles == null || string.IsNullOrWhiteSpace(spawnId))
            return null;

        return this.cachedConfig.Profiles.Select(profile => profile.Spawns?.FirstOrDefault(s => s.Id == spawnId)).FirstOrDefault(spawn => spawn != null);
    }

    /// <summary>
    /// Filter spawns based on command configuration
    /// </summary>
    /// <param name="spawns">List of spawns to filter</param>
    /// <param name="command">The command that triggered</param>
    /// <param name="userName">The user who triggered the command</param>
    /// <param name="rawInput">The raw command input</param>
    /// <param name="isInternal">Whether the command is internal</param>
    /// <param name="isBotAccount">Whether the command is from a bot account</param>
    /// <returns>List of spawns that match the command configuration</returns>
    private List<Spawn> FilterSpawnsByCommandConfig(List<Spawn> spawns, string command, string userName, string rawInput, bool isInternal, bool isBotAccount)
    {
        List<Spawn> validSpawns = new List<Spawn>();

        foreach (Spawn spawn in spawns)
        {
            if (spawn.Trigger?.Type != "streamerbot.command")
                continue;

            Dictionary<string, object> config = spawn.Trigger.Config;
            if (config == null)
                continue;

            // Check if command matches aliases
            bool commandMatches = false;
            if (config.ContainsKey("aliases") && config["aliases"] is List<object> aliases)
            {
                foreach (object alias in aliases)
                {
                    if (!(alias is string aliasStr) || string.IsNullOrWhiteSpace(aliasStr))
                        continue;

                    bool caseSensitive = config.ContainsKey("caseSensitive") &&
                                         config["caseSensitive"] is bool cs && cs;

                    if (caseSensitive ? command != aliasStr : !command.Equals(aliasStr, StringComparison.OrdinalIgnoreCase))
                        continue;

                    commandMatches = true;
                    break;
                }
            }

            // Check command ID if provided
            if (!commandMatches && config.ContainsKey("commandId") && config["commandId"] is string commandId)
            {
                // For now, we'll use the command string as a fallback
                // In future implementation, this would match against actual Streamer.bot command IDs
                commandMatches = command.Equals(commandId, StringComparison.OrdinalIgnoreCase);
            }

            if (!commandMatches)
                continue;
            // Check internal command filter
            if (config.ContainsKey("ignoreInternal") && config["ignoreInternal"] is bool ignoreInternal && ignoreInternal && isInternal)
            {
                continue; // Skip internal commands if configured to ignore them
            }

            // Check bot account filter
            if (config.ContainsKey("ignoreBotAccount") && config["ignoreBotAccount"] is bool ignoreBotAccount && ignoreBotAccount && isBotAccount)
            {
                continue; // Skip bot account commands if configured to ignore them
            }

            validSpawns.Add(spawn);
        }

        return validSpawns;
    }

    /// <summary>
    /// Determine the specific Twitch event type from the trigger name
    /// </summary>
    /// <param name="triggerName">The Twitch trigger name from CPH.TryGetArg("triggerName")</param>
    /// <returns>The specific Twitch event type</returns>
    private static string DetermineTwitchEventType(string triggerName)
    {
        if (string.IsNullOrWhiteSpace(triggerName))
            return null;

        // Map Streamer.bot Twitch trigger names to our internal trigger types
        switch (triggerName)
        {
            case "Follow":
                return "follow";
            case "Cheer":
                return "cheer";
            case "Subscription":
                return "subscription";
            case "Gift Subscription":
                return "giftSub";
            case "Channel Point Reward":
                return "channelPointReward";
            case "Raid":
                return "raid";
            case "Host":
                return "host";
            case "Announcement":
                return "announcement";
            case "Present Viewers":
                return "presentViewers";
            default:
                return null;
        }
    }

    /// <summary>
    /// Get Twitch event data from Streamer.bot arguments
    /// </summary>
    /// <param name="eventType">The Twitch event type</param>
    /// <returns>Dictionary containing event data</returns>
    private Dictionary<string, object> GetTwitchEventData(string eventType)
    {
        Dictionary<string, object> eventData = new Dictionary<string, object>();

        // Get basic user data
        CPH.TryGetArg("userId", out string userId);
        CPH.TryGetArg("userName", out string userName);
        CPH.TryGetArg("displayName", out string displayName);

        eventData["eventType"] = eventType;
        eventData["userId"] = userId ?? "";
        eventData["userName"] = userName ?? "";
        eventData["displayName"] = displayName ?? "";

        // Add event-specific data
        switch (eventType)
        {
            case "cheer":
                CPH.TryGetArg("bits", out int bits);
                CPH.TryGetArg("message", out string cheerMessage);
                eventData["bits"] = bits;
                eventData["message"] = cheerMessage ?? "";
                break;
            case "subscription":
                CPH.TryGetArg("tier", out string subTier);
                CPH.TryGetArg("months", out int months);
                CPH.TryGetArg("message", out string subMessage);
                eventData["tier"] = subTier ?? "1000";
                eventData["months"] = months;
                eventData["message"] = subMessage ?? "";
                break;
            case "giftSub":
                CPH.TryGetArg("count", out int count);
                CPH.TryGetArg("tier", out string giftTier);
                CPH.TryGetArg("recipientUserName", out string recipientUserName);
                eventData["count"] = count;
                eventData["tier"] = giftTier ?? "1000";
                eventData["recipientUserName"] = recipientUserName ?? "";
                break;
            case "channelPointReward":
                CPH.TryGetArg("rewardId", out string rewardId);
                CPH.TryGetArg("rewardName", out string rewardName);
                CPH.TryGetArg("cost", out int cost);
                CPH.TryGetArg("userInput", out string userInput);
                eventData["rewardId"] = rewardId ?? "";
                eventData["rewardName"] = rewardName ?? "";
                eventData["cost"] = cost;
                eventData["userInput"] = userInput ?? "";
                break;
        }

        return eventData;
    }

    /// <summary>
    /// Filter spawns based on Twitch event configuration
    /// </summary>
    /// <param name="spawns">List of spawns to filter</param>
    /// <param name="eventType">The Twitch event type</param>
    /// <param name="eventData">The event data</param>
    /// <returns>List of spawns that match the Twitch event configuration</returns>
    private List<Spawn> FilterSpawnsByTwitchConfig(List<Spawn> spawns, string eventType, Dictionary<string, object> eventData)
    {
        List<Spawn> validSpawns = new List<Spawn>();

        foreach (Spawn spawn in spawns)
        {
            if (spawn.Trigger?.Type != $"twitch.{eventType}")
                continue;

            Dictionary<string, object> config = spawn.Trigger.Config;
            if (config == null)
                continue;

            bool matches = true;

            // Apply event-specific filtering
            switch (eventType)
            {
                case "cheer":
                    if (config.ContainsKey("bits") && config["bits"] is int minBits)
                    {
                        int bits = eventData.ContainsKey("bits") && eventData["bits"] is int b ? b : 0;
                        if (bits < minBits)
                            matches = false;
                    }
                    break;

                case "subscription":
                    if (config.ContainsKey("tier") && config["tier"] is string configTier)
                    {
                        string eventTier = eventData.ContainsKey("tier") && eventData["tier"] is string t ? t : "1000";
                        if (eventTier != configTier)
                            matches = false;
                    }
                    if (config.ContainsKey("months") && config["months"] is int minMonths)
                    {
                        int months = eventData.ContainsKey("months") && eventData["months"] is int m ? m : 1;
                        if (months < minMonths)
                            matches = false;
                    }
                    break;

                case "giftSub":
                    if (config.ContainsKey("minCount") && config["minCount"] is int minCount)
                    {
                        int count = eventData.ContainsKey("count") && eventData["count"] is int c ? c : 1;
                        if (count < minCount)
                            matches = false;
                    }
                    if (config.ContainsKey("tier") && config["tier"] is string giftConfigTier)
                    {
                        string eventTier = eventData.ContainsKey("tier") && eventData["tier"] is string t ? t : "1000";
                        if (eventTier != giftConfigTier)
                            matches = false;
                    }
                    break;

                case "channelPointReward":
                    if (config.ContainsKey("rewardIdentifier") && config["rewardIdentifier"] is string rewardId)
                    {
                        string eventRewardId = eventData.ContainsKey("rewardId") && eventData["rewardId"] is string r ? r : "";
                        if (eventRewardId != rewardId)
                            matches = false;
                    }
                    break;
            }

            if (matches)
            {
                validSpawns.Add(spawn);
            }
        }

        return validSpawns;
    }

    /// <summary>
    /// Execute a list of spawns with the given trigger context and state management
    /// </summary>
    /// <param name="spawns">List of spawns to execute</param>
    /// <param name="triggerType">The type of trigger that activated these spawns</param>
    /// <param name="contextData">Additional context data for the execution</param>
    /// <returns>True if all spawns executed successfully</returns>
    private bool ExecuteSpawns(List<Spawn> spawns, string triggerType, Dictionary<string, object> contextData)
    {
        Stopwatch stopwatch = Stopwatch.StartNew();
        string executionId = Guid.NewGuid().ToString("N").Substring(0, 8);

        try
        {
            LogExecution(LogLevel.Info, $"ExecuteSpawns[{executionId}]: Starting execution of {spawns?.Count ?? 0} spawns for trigger '{triggerType}'");

            if (spawns == null || spawns.Count == 0)
            {
                LogExecution(LogLevel.Info, $"ExecuteSpawns[{executionId}]: No spawns to execute");
                return true;
            }

            // Validate input parameters
            Dictionary<string, object> parameters = new Dictionary<string, object>
            {
                ["spawns"] = spawns,
                ["triggerType"] = triggerType,
            };

            if (!ValidateInputParameters("ExecuteSpawns", parameters))
            {
                return false;
            }

            bool allSuccessful = true;
            List<string> executionIds = new List<string>();
            int successfulSpawns = 0;
            int failedSpawns = 0;

            // Clean up any completed spawns before starting new ones
            Stopwatch cleanupStopwatch = Stopwatch.StartNew();
            CleanupCompletedSpawns();
            cleanupStopwatch.Stop();
            LogExecution(LogLevel.Info, $"ExecuteSpawns[{executionId}]: Cleanup completed in {cleanupStopwatch.ElapsedMilliseconds}ms");

            foreach (Spawn spawn in spawns)
            {
                Stopwatch spawnStopwatch = Stopwatch.StartNew();

                try
                {
                    LogExecution(LogLevel.Info, $"ExecuteSpawns[{executionId}]: Executing spawn '{spawn.Name}' (ID: {spawn.Id})");

                    // Start tracking this spawn execution
                    string spawnExecutionId = StartSpawnExecution(spawn, triggerType, contextData);
                    executionIds.Add(spawnExecutionId);

                    // Set spawn context in global variables for other actions
                    CPH.SetGlobalVar("MediaSpawner_CurrentSpawn", JsonConvert.SerializeObject(spawn), persisted: false);
                    CPH.SetGlobalVar("MediaSpawner_CurrentSpawnId", spawn.Id, persisted: false);
                    CPH.SetGlobalVar("MediaSpawner_CurrentSpawnName", spawn.Name, persisted: false);
                    CPH.SetGlobalVar("MediaSpawner_TriggerType", triggerType, persisted: false);
                    CPH.SetGlobalVar("MediaSpawner_ExecutionId", spawnExecutionId, persisted: false);

                    // Set context data
                    foreach (KeyValuePair<string, object> kvp in contextData)
                    {
                        CPH.SetGlobalVar($"MediaSpawner_Context_{kvp.Key}", kvp.Value?.ToString() ?? "", persisted: false);
                    }

                    // Execute the spawn
                    bool spawnResult = ExecuteSpawn(spawn, triggerType, contextData, spawnExecutionId);

                    // Complete tracking
                    CompleteSpawnExecution(spawnExecutionId, spawnResult ? "Success" : "Failed");

                    spawnStopwatch.Stop();
                    long spawnExecutionTime = spawnStopwatch.ElapsedMilliseconds;

                    if (spawnResult)
                    {
                        successfulSpawns++;
                        LogExecution(LogLevel.Info, $"ExecuteSpawns[{executionId}]: Spawn '{spawn.Name}' executed successfully in {spawnExecutionTime}ms");
                    }
                    else
                    {
                        failedSpawns++;
                        LogExecution(LogLevel.Warning, $"ExecuteSpawns[{executionId}]: Spawn '{spawn.Name}' execution failed in {spawnExecutionTime}ms");
                        allSuccessful = false;
                    }
                }
                catch (Exception ex)
                {
                    spawnStopwatch.Stop();
                    long spawnExecutionTime = spawnStopwatch.ElapsedMilliseconds;

                    Dictionary<string, object> context = new Dictionary<string, object>
                    {
                        ["spawnName"] = spawn?.Name,
                        ["spawnId"] = spawn?.Id,
                        ["triggerType"] = triggerType,
                        ["executionTime"] = spawnExecutionTime,
                    };

                    string errorMessage = CreateStructuredErrorMessage("ExecuteSpawns", ex, context);
                    LogExecution(LogLevel.Error, $"ExecuteSpawns[{executionId}]: {errorMessage}");

                    // Complete tracking with error status
                    if (executionIds.Count > 0)
                    {
                        string lastExecutionId = executionIds[executionIds.Count - 1];
                        CompleteSpawnExecution(lastExecutionId, "Failed", ex.Message);
                    }

                    failedSpawns++;
                    allSuccessful = false;
                }
            }

            stopwatch.Stop();
            long totalExecutionTime = stopwatch.ElapsedMilliseconds;

            // Log comprehensive execution summary
            Dictionary<string, object> executionSummary = new Dictionary<string, object>
            {
                ["executionId"] = executionId,
                ["totalSpawns"] = spawns.Count,
                ["successfulSpawns"] = successfulSpawns,
                ["failedSpawns"] = failedSpawns,
                ["successRate"] = spawns.Count > 0 ? (double)successfulSpawns / spawns.Count : 0.0,
                ["totalExecutionTime"] = totalExecutionTime,
                ["averageSpawnTime"] = spawns.Count > 0 ? totalExecutionTime / spawns.Count : 0,
                ["triggerType"] = triggerType,
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"),
            };

            LogExecution(LogLevel.Info, $"ExecuteSpawns[{executionId}]: Execution completed in {totalExecutionTime}ms. Summary: {JsonConvert.SerializeObject(executionSummary)}");

            // Log state summary
            Dictionary<string, object> stateSummary = GetStateSummary();
            LogExecution(LogLevel.Info, $"ExecuteSpawns[{executionId}]: State summary: {JsonConvert.SerializeObject(stateSummary)}");

            return allSuccessful;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            long totalExecutionTime = stopwatch.ElapsedMilliseconds;

            Dictionary<string, object> context = new Dictionary<string, object>
            {
                ["spawnCount"] = spawns?.Count ?? 0,
                ["triggerType"] = triggerType,
                ["executionTime"] = totalExecutionTime,
            };

            string errorMessage = CreateStructuredErrorMessage("ExecuteSpawns", ex, context);
            LogExecution(LogLevel.Error, $"ExecuteSpawns[{executionId}]: {errorMessage}");

            return false;
        }
    }

    #endregion

    #region Spawn Execution Engine

    /// <summary>
    /// Execute a single spawn with asset selection, property resolution, and OBS coordination
    /// </summary>
    /// <param name="spawn">The spawn to execute</param>
    /// <param name="triggerType">The type of trigger that activated this spawn</param>
    /// <param name="contextData">Additional context data for the execution</param>
    /// <param name="executionId">The execution ID for tracking (optional)</param>
    /// <returns>True if spawn executed successfully</returns>
    private bool ExecuteSpawn(Spawn spawn, string triggerType, Dictionary<string, object> contextData, string executionId = null)
    {
        Stopwatch stopwatch = Stopwatch.StartNew();
        if (string.IsNullOrEmpty(executionId))
        {
            executionId = Guid.NewGuid().ToString("N").Substring(0, 8);
        }

        try
        {
            LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Starting execution of spawn '{spawn.Name}' (ID: {spawn.Id})");

            // Validate input parameters
            Dictionary<string, object> parameters = new Dictionary<string, object>
            {
                ["spawn"] = spawn,
                ["triggerType"] = triggerType,
            };

            if (!ValidateInputParameters("ExecuteSpawn", parameters))
            {
                return false;
            }

            // Validate spawn is enabled
            if (!spawn.Enabled)
            {
                LogExecution(LogLevel.Warning, $"ExecuteSpawn[{executionId}]: Spawn '{spawn.Name}' is disabled, skipping execution");
                return false;
            }

            // Get enabled assets from the spawn
            Stopwatch assetSelectionStopwatch = Stopwatch.StartNew();
            List<SpawnAsset> enabledAssets = GetEnabledSpawnAssets(spawn);
            assetSelectionStopwatch.Stop();

            if (enabledAssets.Count == 0)
            {
                LogExecution(LogLevel.Warning, $"ExecuteSpawn[{executionId}]: No enabled assets found in spawn '{spawn.Name}' (selection took {assetSelectionStopwatch.ElapsedMilliseconds}ms)");
                return true; // Not an error, just no assets to process
            }

            LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Found {enabledAssets.Count} enabled assets in {assetSelectionStopwatch.ElapsedMilliseconds}ms");

            // Process randomization buckets to select assets
            Stopwatch randomizationStopwatch = Stopwatch.StartNew();
            List<SpawnAsset> selectedAssets = ProcessRandomizationBuckets(spawn, enabledAssets);
            randomizationStopwatch.Stop();

            if (selectedAssets.Count == 0)
            {
                LogExecution(LogLevel.Warning, $"ExecuteSpawn[{executionId}]: No assets selected after randomization processing for spawn '{spawn.Name}' (randomization took {randomizationStopwatch.ElapsedMilliseconds}ms)");
                return true; // Not an error, just no assets selected
            }

            LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Selected {selectedAssets.Count} assets for execution in {randomizationStopwatch.ElapsedMilliseconds}ms");

            // Execute each selected asset
            bool allAssetsSuccessful = true;
            int successfulAssets = 0;
            int failedAssets = 0;
            Stopwatch assetExecutionStopwatch = Stopwatch.StartNew();
            List<SpawnAsset> successfulAssetList = new List<SpawnAsset>();
            List<SpawnAsset> failedAssetList = new List<SpawnAsset>();

            foreach (SpawnAsset spawnAsset in selectedAssets)
            {
                Stopwatch individualAssetStopwatch = Stopwatch.StartNew();

                try
                {
                    bool assetResult = ExecuteSpawnAsset(spawn, spawnAsset, triggerType, contextData, out string generatedSourceGuid);

                    individualAssetStopwatch.Stop();
                    long assetExecutionTime = individualAssetStopwatch.ElapsedMilliseconds;

                    if (assetResult)
                    {
                        successfulAssets++;
                        successfulAssetList.Add(spawnAsset);

                        // Store the generated GUID in ActiveSpawnExecution if we have one
                        if (!string.IsNullOrEmpty(generatedSourceGuid))
                        {
                            lock (this.lockObject)
                            {
                                // Find the active execution by spawn ID
                                var activeExecution = this.activeSpawns.Values.FirstOrDefault(e => e.SpawnId == spawn.Id);
                                if (activeExecution != null)
                                {
                                    activeExecution.SourceGuids[spawnAsset.Id] = generatedSourceGuid;
                                }
                            }
                        }

                        LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Asset '{spawnAsset.AssetId}' executed successfully in {assetExecutionTime}ms with source GUID '{generatedSourceGuid}'");
                    }
                    else
                    {
                        failedAssets++;
                        failedAssetList.Add(spawnAsset);
                        LogExecution(LogLevel.Warning, $"ExecuteSpawn[{executionId}]: Asset '{spawnAsset.AssetId}' execution failed in {assetExecutionTime}ms");
                        allAssetsSuccessful = false;
                    }
                }
                catch (Exception ex)
                {
                    individualAssetStopwatch.Stop();
                    long assetExecutionTime = individualAssetStopwatch.ElapsedMilliseconds;

                    Dictionary<string, object> context = new Dictionary<string, object>
                    {
                        ["spawnName"] = spawn.Name,
                        ["spawnId"] = spawn.Id,
                        ["assetId"] = spawnAsset?.AssetId,
                        ["triggerType"] = triggerType,
                        ["executionTime"] = assetExecutionTime,
                    };

                    string errorMessage = CreateStructuredErrorMessage("ExecuteSpawn", ex, context);
                    LogExecution(LogLevel.Error, $"ExecuteSpawn[{executionId}]: {errorMessage}");

                    failedAssets++;
                    failedAssetList.Add(spawnAsset);
                    allAssetsSuccessful = false;
                }
            }

            // Attempt recovery for failed assets
            if (failedAssetList.Count > 0)
            {
                LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Attempting recovery for {failedAssetList.Count} failed assets");

                Stopwatch recoveryStopwatch = Stopwatch.StartNew();
                bool recoverySuccessful = AttemptSpawnRecovery(spawn, failedAssetList, triggerType, contextData);
                recoveryStopwatch.Stop();

                if (recoverySuccessful)
                {
                    LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Recovery completed successfully in {recoveryStopwatch.ElapsedMilliseconds}ms");
                    // Update success metrics based on recovery results
                    // Note: This is a simplified approach - in a real implementation, you'd want to track
                    // which specific assets were recovered and update the metrics accordingly
                }
                else
                {
                    LogExecution(LogLevel.Warning, $"ExecuteSpawn[{executionId}]: Recovery failed or only partially successful in {recoveryStopwatch.ElapsedMilliseconds}ms");

                    // Clean up partial execution if recovery failed completely
                    if (successfulAssetList.Count > 0)
                    {
                        LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Cleaning up partial execution due to recovery failure");
                        CleanupPartialExecution(spawn, successfulAssetList, failedAssetList, executionId);
                    }
                }
            }

            assetExecutionStopwatch.Stop();
            long totalAssetExecutionTime = assetExecutionStopwatch.ElapsedMilliseconds;

            // Handle spawn-level timing and cleanup
            if (spawn.Duration > 0)
            {
                LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Spawn '{spawn.Name}' will run for {spawn.Duration}ms");

                // Create spawn-level cleanup timers for all successfully executed assets
                // Only create timers for assets that don't already have asset-level cleanup timers
                int spawnCleanupTimersCreated = 0;
                foreach (SpawnAsset successfulAsset in successfulAssetList)
                {
                    // Check if this asset already has an asset-level cleanup timer
                    // Asset-level cleanup uses spawnAsset.Id as source name
                    double assetDuration = GetAssetDuration(spawn, successfulAsset);
                    bool hasAssetLevelCleanup = assetDuration > 0;

                    if (!hasAssetLevelCleanup)
                    {
                        // Get the tracked GUID for this asset
                        string sourceGuid = null;
                        lock (this.lockObject)
                        {
                            var activeExecution = this.activeSpawns.Values.FirstOrDefault(e => e.SpawnId == spawn.Id);
                            if (activeExecution != null && activeExecution.SourceGuids.TryGetValue(successfulAsset.Id, out sourceGuid))
                            {
                                // Create spawn-level cleanup timer for this asset using the tracked GUID
                                bool cleanupTimerCreated = CreateDurationCleanupTimer(sourceGuid, spawn.Duration);
                                if (cleanupTimerCreated)
                                {
                                    spawnCleanupTimersCreated++;
                                    LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Created spawn-level cleanup timer for asset '{successfulAsset.AssetId}' with GUID '{sourceGuid}' (duration: {spawn.Duration}ms)");
                                }
                            }
                            else
                            {
                                LogExecution(LogLevel.Warning, $"ExecuteSpawn[{executionId}]: No tracked GUID found for asset '{successfulAsset.AssetId}', skipping spawn-level cleanup timer");
                            }
                        }
                    }
                    else
                    {
                        LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Asset '{successfulAsset.AssetId}' already has asset-level cleanup timer (duration: {assetDuration}ms), skipping spawn-level cleanup");
                    }
                }

                LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Created {spawnCleanupTimersCreated} spawn-level cleanup timers for spawn '{spawn.Name}'");
            }

            stopwatch.Stop();
            long totalExecutionTime = stopwatch.ElapsedMilliseconds;

            // Log comprehensive execution summary
            Dictionary<string, object> executionSummary = new Dictionary<string, object>
            {
                ["executionId"] = executionId,
                ["spawnName"] = spawn.Name,
                ["spawnId"] = spawn.Id,
                ["totalAssets"] = selectedAssets.Count,
                ["successfulAssets"] = successfulAssets,
                ["failedAssets"] = failedAssets,
                ["successRate"] = selectedAssets.Count > 0 ? (double)successfulAssets / selectedAssets.Count : 0.0,
                ["totalExecutionTime"] = totalExecutionTime,
                ["assetSelectionTime"] = assetSelectionStopwatch.ElapsedMilliseconds,
                ["randomizationTime"] = randomizationStopwatch.ElapsedMilliseconds,
                ["assetExecutionTime"] = totalAssetExecutionTime,
                ["averageAssetTime"] = selectedAssets.Count > 0 ? totalAssetExecutionTime / selectedAssets.Count : 0,
                ["triggerType"] = triggerType,
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"),
            };

            LogExecution(LogLevel.Info, $"ExecuteSpawn[{executionId}]: Execution completed in {totalExecutionTime}ms. Summary: {JsonConvert.SerializeObject(executionSummary)}");

            return allAssetsSuccessful;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            long totalExecutionTime = stopwatch.ElapsedMilliseconds;

            Dictionary<string, object> context = new Dictionary<string, object>
            {
                ["spawnName"] = spawn?.Name,
                ["spawnId"] = spawn?.Id,
                ["triggerType"] = triggerType,
                ["executionTime"] = totalExecutionTime,
            };

            string errorMessage = CreateStructuredErrorMessage("ExecuteSpawn", ex, context);
            LogExecution(LogLevel.Error, $"ExecuteSpawn[{executionId}]: {errorMessage}");

            return false;
        }
    }

    /// <summary>
    /// Get all enabled assets from a spawn, sorted by order
    /// </summary>
    /// <param name="spawn">The spawn to get assets from</param>
    /// <returns>List of enabled spawn assets sorted by order</returns>
    private List<SpawnAsset> GetEnabledSpawnAssets(Spawn spawn)
    {
        Stopwatch stopwatch = Stopwatch.StartNew();
        string executionId = Guid.NewGuid().ToString("N").Substring(0, 8);

        try
        {
            // Validate input parameters
            if (spawn == null)
            {
                LogStructuredError("GetEnabledSpawnAssets", "Spawn parameter is null", new Dictionary<string, object> { ["executionId"] = executionId });
                return new List<SpawnAsset>();
            }

            LogStructuredInfo("GetEnabledSpawnAssets", $"Getting enabled assets for spawn '{spawn.Name}'", new Dictionary<string, object>
            {
                ["executionId"] = executionId,
                ["spawnId"] = spawn.Id,
                ["totalAssetsCount"] = spawn.Assets?.Count ?? 0,
            });

            if (spawn.Assets == null)
            {
                LogStructuredWarning("GetEnabledSpawnAssets", "Spawn has no assets", new Dictionary<string, object> { ["executionId"] = executionId, ["spawnName"] = spawn.Name });
                return new List<SpawnAsset>();
            }

            List<SpawnAsset> enabledAssets = new List<SpawnAsset>();
            int enabledCount = 0;
            int disabledCount = 0;
            int nullAssetCount = 0;

            foreach (SpawnAsset asset in spawn.Assets)
            {
                if (asset == null)
                {
                    nullAssetCount++;
                    LogStructuredWarning("GetEnabledSpawnAssets", "Encountered null asset in spawn", new Dictionary<string, object> { ["executionId"] = executionId, ["spawnName"] = spawn.Name });
                    continue;
                }

                if (asset.Enabled)
                {
                    enabledAssets.Add(asset);
                    enabledCount++;
                }
                else
                {
                    disabledCount++;
                }
            }

            // Sort by order
            enabledAssets = enabledAssets.OrderBy(asset => asset.Order).ToList();

            stopwatch.Stop();
            long executionTime = stopwatch.ElapsedMilliseconds;

            Dictionary<string, object> summary = new Dictionary<string, object>
            {
                ["executionId"] = executionId,
                ["spawnName"] = spawn.Name,
                ["spawnId"] = spawn.Id,
                ["totalAssetsCount"] = spawn.Assets.Count,
                ["enabledAssetsCount"] = enabledCount,
                ["disabledAssetsCount"] = disabledCount,
                ["nullAssetsCount"] = nullAssetCount,
                ["executionTimeMs"] = executionTime,
            };

            LogStructuredInfo("GetEnabledSpawnAssets", "Enabled asset retrieval completed", summary);

            return enabledAssets;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            long executionTime = stopwatch.ElapsedMilliseconds;

            Dictionary<string, object> context = new Dictionary<string, object>
            {
                ["executionId"] = executionId,
                ["spawnName"] = spawn?.Name,
                ["spawnId"] = spawn?.Id,
                ["executionTimeMs"] = executionTime,
            };

            LogStructuredError("GetEnabledSpawnAssets", $"Unexpected error getting enabled assets: {ex.Message}", context);

            // Return empty list as fallback
            return new List<SpawnAsset>();
        }
    }

    /// <summary>
    /// Process randomization buckets to select assets for execution
    /// </summary>
    /// <param name="spawn">The spawn containing the buckets</param>
    /// <param name="enabledAssets">The enabled assets to select from</param>
    /// <returns>List of selected assets for execution</returns>
    private List<SpawnAsset> ProcessRandomizationBuckets(Spawn spawn, List<SpawnAsset> enabledAssets)
    {
        Stopwatch stopwatch = Stopwatch.StartNew();
        string executionId = Guid.NewGuid().ToString("N").Substring(0, 8);

        try
        {
            // Validate input parameters
            if (spawn == null)
            {
                LogStructuredError("ProcessRandomizationBuckets", "Spawn parameter is null", new Dictionary<string, object> { ["executionId"] = executionId });
                return new List<SpawnAsset>();
            }

            if (enabledAssets == null)
            {
                LogStructuredWarning("ProcessRandomizationBuckets", "Enabled assets parameter is null, returning empty list", new Dictionary<string, object> { ["executionId"] = executionId });
                return new List<SpawnAsset>();
            }

            LogStructuredInfo("ProcessRandomizationBuckets", $"Processing randomization buckets for spawn '{spawn.Name}'", new Dictionary<string, object>
            {
                ["executionId"] = executionId,
                ["spawnId"] = spawn.Id,
                ["enabledAssetsCount"] = enabledAssets.Count,
                ["bucketsCount"] = spawn.RandomizationBuckets?.Count ?? 0,
            });

            if (spawn.RandomizationBuckets == null || spawn.RandomizationBuckets.Count == 0)
            {
                LogStructuredInfo("ProcessRandomizationBuckets", "No randomization buckets found, returning all enabled assets", new Dictionary<string, object> { ["executionId"] = executionId });
                return enabledAssets;
            }

            List<SpawnAsset> selectedAssets = new List<SpawnAsset>();
            HashSet<string> usedAssetIds = new HashSet<string>();
            int processedBuckets = 0;
            int failedBuckets = 0;

            foreach (RandomizationBucket bucket in spawn.RandomizationBuckets)
            {
                try
                {
                    if (bucket == null)
                    {
                        LogStructuredWarning("ProcessRandomizationBuckets", "Encountered null bucket, skipping", new Dictionary<string, object> { ["executionId"] = executionId });
                        continue;
                    }

                    LogStructuredInfo("ProcessRandomizationBuckets", $"Processing bucket '{bucket.Name}'", new Dictionary<string, object>
                    {
                        ["executionId"] = executionId,
                        ["bucketName"] = bucket.Name,
                        ["bucketSelection"] = bucket.Selection,
                        ["bucketN"] = bucket.N,
                    });

                    List<SpawnAsset> bucketAssets = GetBucketAssets(spawn, bucket, enabledAssets);
                    if (bucketAssets.Count == 0)
                    {
                        LogStructuredWarning("ProcessRandomizationBuckets", $"No assets found in bucket '{bucket.Name}', skipping", new Dictionary<string, object> { ["executionId"] = executionId });
                        continue;
                    }

                    List<SpawnAsset> selectedFromBucket = SelectAssetsFromBucket(bucket, bucketAssets, usedAssetIds);
                    selectedAssets.AddRange(selectedFromBucket);

                    // Mark selected assets as used
                    foreach (SpawnAsset asset in selectedFromBucket)
                    {
                        if (asset != null && !string.IsNullOrEmpty(asset.Id))
                        {
                            usedAssetIds.Add(asset.Id);
                        }
                    }

                    processedBuckets++;
                    LogStructuredInfo("ProcessRandomizationBuckets", $"Successfully processed bucket '{bucket.Name}'", new Dictionary<string, object>
                    {
                        ["executionId"] = executionId,
                        ["bucketName"] = bucket.Name,
                        ["selectedCount"] = selectedFromBucket.Count,
                        ["totalSelected"] = selectedAssets.Count,
                    });
                }
                catch (Exception ex)
                {
                    failedBuckets++;
                    Dictionary<string, object> context = new Dictionary<string, object>
                    {
                        ["executionId"] = executionId,
                        ["bucketName"] = bucket?.Name ?? "unknown",
                        ["bucketId"] = bucket?.Id ?? "unknown",
                        ["error"] = ex.Message,
                    };

                    LogStructuredError("ProcessRandomizationBuckets", $"Error processing bucket '{bucket?.Name ?? "unknown"}': {ex.Message}", context);
                }
            }

            // Add any remaining enabled assets that weren't in buckets
            int remainingAssets = 0;
            foreach (SpawnAsset asset in enabledAssets)
            {
                if (asset != null && !string.IsNullOrEmpty(asset.Id) && !usedAssetIds.Contains(asset.Id))
                {
                    selectedAssets.Add(asset);
                    remainingAssets++;
                }
            }

            stopwatch.Stop();
            long executionTime = stopwatch.ElapsedMilliseconds;

            Dictionary<string, object> summary = new Dictionary<string, object>
            {
                ["executionId"] = executionId,
                ["spawnName"] = spawn.Name,
                ["spawnId"] = spawn.Id,
                ["totalBuckets"] = spawn.RandomizationBuckets.Count,
                ["processedBuckets"] = processedBuckets,
                ["failedBuckets"] = failedBuckets,
                ["enabledAssetsCount"] = enabledAssets.Count,
                ["selectedAssetsCount"] = selectedAssets.Count,
                ["remainingAssetsCount"] = remainingAssets,
                ["executionTimeMs"] = executionTime,
            };

            LogStructuredInfo("ProcessRandomizationBuckets", "Randomization bucket processing completed", summary);

            return selectedAssets;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            long executionTime = stopwatch.ElapsedMilliseconds;

            Dictionary<string, object> context = new Dictionary<string, object>
            {
                ["executionId"] = executionId,
                ["spawnName"] = spawn?.Name,
                ["spawnId"] = spawn?.Id,
                ["enabledAssetsCount"] = enabledAssets?.Count ?? 0,
                ["executionTimeMs"] = executionTime,
            };

            LogStructuredError("ProcessRandomizationBuckets", $"Unexpected error during randomization processing: {ex.Message}", context);

            // Return enabled assets as fallback
            return enabledAssets ?? new List<SpawnAsset>();
        }
    }

    /// <summary>
    /// Get assets that belong to a specific randomization bucket
    /// </summary>
    /// <param name="spawn">The spawn containing the assets</param>
    /// <param name="bucket">The bucket to get assets for</param>
    /// <param name="enabledAssets">The enabled assets to filter from</param>
    /// <returns>List of assets that belong to this bucket</returns>
    private List<SpawnAsset> GetBucketAssets(Spawn spawn, RandomizationBucket bucket, List<SpawnAsset> enabledAssets)
    {
        List<SpawnAsset> bucketAssets = new List<SpawnAsset>();
        HashSet<string> enabledAssetIds = new HashSet<string>(enabledAssets.Select(a => a.Id));

        foreach (RandomizationBucketMember member in bucket.Members)
        {
            SpawnAsset asset = enabledAssets.FirstOrDefault(a => a.Id == member.SpawnAssetId);
            if (asset != null && enabledAssetIds.Contains(asset.Id))
            {
                bucketAssets.Add(asset);
            }
        }

        return bucketAssets;
    }

    /// <summary>
    /// Select assets from a randomization bucket based on its configuration
    /// </summary>
    /// <param name="bucket">The bucket configuration</param>
    /// <param name="availableAssets">The assets available for selection</param>
    /// <param name="usedAssetIds">Assets that have already been used</param>
    /// <returns>List of selected assets</returns>
    private List<SpawnAsset> SelectAssetsFromBucket(RandomizationBucket bucket, List<SpawnAsset> availableAssets, HashSet<string> usedAssetIds)
    {
        List<SpawnAsset> selectedAssets = new List<SpawnAsset>();
        List<SpawnAsset> unusedAssets = availableAssets.Where(a => !usedAssetIds.Contains(a.Id)).ToList();

        if (unusedAssets.Count == 0)
            return selectedAssets;

        switch (bucket.Selection)
        {
            case "one":
                selectedAssets.Add(SelectSingleAsset(bucket, unusedAssets));
                break;

            case "n":
                if (bucket.N.HasValue && bucket.N.Value > 0)
                {
                    int selectCount = Math.Min(bucket.N.Value, unusedAssets.Count);
                    selectedAssets.AddRange(SelectMultipleAssets(bucket, unusedAssets, selectCount));
                }
                break;

            default:
                LogExecution(LogLevel.Warning, $"SelectAssetsFromBucket: Unknown selection type '{bucket.Selection}' for bucket '{bucket.Name}'");
                break;
        }

        return selectedAssets;
    }

    /// <summary>
    /// Select a single asset from a bucket
    /// </summary>
    /// <param name="bucket">The bucket configuration</param>
    /// <param name="availableAssets">The assets available for selection</param>
    /// <returns>The selected asset</returns>
    private SpawnAsset SelectSingleAsset(RandomizationBucket bucket, List<SpawnAsset> availableAssets)
    {
        if (availableAssets.Count == 0)
            return null;

        if (availableAssets.Count == 1)
            return availableAssets[0];

        if (bucket.Weighted == true)
        {
            return SelectWeightedAsset(bucket, availableAssets);
        }
        else
        {
            // Simple random selection
            Random random = new Random();
            return availableAssets[random.Next(availableAssets.Count)];
        }
    }

    /// <summary>
    /// Select multiple assets from a bucket
    /// </summary>
    /// <param name="bucket">The bucket configuration</param>
    /// <param name="availableAssets">The assets available for selection</param>
    /// <param name="selectCount">Number of assets to select</param>
    /// <returns>List of selected assets</returns>
    private List<SpawnAsset> SelectMultipleAssets(RandomizationBucket bucket, List<SpawnAsset> availableAssets, int selectCount)
    {
        List<SpawnAsset> selectedAssets = new List<SpawnAsset>();
        List<SpawnAsset> remainingAssets = new List<SpawnAsset>(availableAssets);

        for (int i = 0; i < selectCount && remainingAssets.Count > 0; i++)
        {
            SpawnAsset selected = SelectSingleAsset(bucket, remainingAssets);
            if (selected != null)
            {
                selectedAssets.Add(selected);
                remainingAssets.Remove(selected);
            }
        }

        return selectedAssets;
    }

    /// <summary>
    /// Select an asset using weighted selection
    /// </summary>
    /// <param name="bucket">The bucket configuration</param>
    /// <param name="availableAssets">The assets available for selection</param>
    /// <returns>The selected asset</returns>
    private SpawnAsset SelectWeightedAsset(RandomizationBucket bucket, List<SpawnAsset> availableAssets)
    {
        // Calculate total weight
        double totalWeight = 0;
        Dictionary<string, double> assetWeights = new Dictionary<string, double>();

        foreach (SpawnAsset asset in availableAssets)
        {
            RandomizationBucketMember member = bucket.Members.FirstOrDefault(m => m.SpawnAssetId == asset.Id);
            double weight = member?.Weight ?? 1.0; // Default weight of 1.0 if not specified
            assetWeights[asset.Id] = weight;
            totalWeight += weight;
        }

        if (totalWeight <= 0)
        {
            // Fallback to random selection if no valid weights
            Random random = new Random();
            return availableAssets[random.Next(availableAssets.Count)];
        }

        // Weighted random selection
        Random weightedRandom = new Random();
        double randomValue = weightedRandom.NextDouble() * totalWeight;
        double currentWeight = 0;

        foreach (SpawnAsset asset in availableAssets)
        {
            currentWeight += assetWeights[asset.Id];
            if (randomValue <= currentWeight)
            {
                return asset;
            }
        }

        // Fallback to last asset
        return availableAssets.Last();
    }

    /// <summary>
    /// Generate a unique GUID for an OBS source, ensuring no duplicates within the same spawn execution
    /// </summary>
    /// <param name="spawnId">The spawn ID to check for uniqueness within</param>
    /// <returns>A unique GUID string</returns>
    private string GenerateUniqueSourceGuid(string spawnId)
    {
        lock (this.lockObject)
        {
            string guid;
            int attempts = 0;
            const int maxAttempts = 100; // Prevent infinite loop

            do
            {
                guid = Guid.NewGuid().ToString("N");
                attempts++;

                // Check if this GUID is already used in any active spawn execution
                bool isDuplicate = this.activeSpawns.Values.Any(execution =>
                    execution.SourceGuids.Values.Contains(guid));

                if (!isDuplicate)
                {
                    return guid;
                }

                if (attempts >= maxAttempts)
                {
                    LogExecution(LogLevel.Error, $"GenerateUniqueSourceGuid: Failed to generate unique GUID after {maxAttempts} attempts for spawn '{spawnId}'");
                    return guid; // Return the last generated GUID as fallback
                }
            } while (true);
        }
    }

    /// <summary>
    /// Execute a single spawn asset with property resolution and OBS coordination
    /// </summary>
    /// <param name="spawn">The parent spawn</param>
    /// <param name="spawnAsset">The spawn asset to execute</param>
    /// <param name="triggerType">The type of trigger that activated this spawn</param>
    /// <param name="contextData">Additional context data for the execution</param>
    /// <param name="generatedSourceGuid">The generated GUID for the OBS source (output parameter)</param>
    /// <returns>True if asset executed successfully</returns>
    private bool ExecuteSpawnAsset(Spawn spawn, SpawnAsset spawnAsset, string triggerType, Dictionary<string, object> contextData, out string generatedSourceGuid)
    {
        // Initialize out parameter
        generatedSourceGuid = string.Empty;

        Stopwatch stopwatch = Stopwatch.StartNew();
        string executionId = Guid.NewGuid().ToString("N").Substring(0, 8);

        try
        {
            // Generate unique GUID for this OBS source
            generatedSourceGuid = GenerateUniqueSourceGuid(spawn.Id);

            LogExecution(LogLevel.Info, $"ExecuteSpawnAsset[{executionId}]: Executing asset '{spawnAsset.AssetId}' in spawn '{spawn.Name}' with source GUID '{generatedSourceGuid}'");

            // Validate input parameters
            Dictionary<string, object> parameters = new Dictionary<string, object>
            {
                ["spawn"] = spawn,
                ["spawnAsset"] = spawnAsset,
            };

            if (!ValidateInputParameters("ExecuteSpawnAsset", parameters))
            {
                generatedSourceGuid = string.Empty;
                return false;
            }

            // Find the base asset with graceful degradation
            MediaAsset baseAsset = this.cachedConfig?.FindAssetById(spawnAsset.AssetId);
            if (baseAsset == null)
            {
                LogExecution(LogLevel.Warning, $"ExecuteSpawnAsset[{executionId}]: Base asset '{spawnAsset.AssetId}' not found in configuration - skipping asset");

                // Try to find a fallback asset or continue without this asset
                if (TryFindFallbackAsset(spawnAsset, out MediaAsset fallbackAsset))
                {
                    LogExecution(LogLevel.Info, $"ExecuteSpawnAsset[{executionId}]: Using fallback asset '{fallbackAsset.Name}' for missing asset '{spawnAsset.AssetId}'");
                    baseAsset = fallbackAsset;
                }
                else
                {
                    LogExecution(LogLevel.Warning, $"ExecuteSpawnAsset[{executionId}]: No fallback asset available, continuing without asset '{spawnAsset.AssetId}'");
                    generatedSourceGuid = string.Empty;
                    return true; // Don't fail the entire spawn for missing assets
                }
            }

            // Check OBS connection with graceful degradation
            if (!ValidateOBSConnection())
            {
                LogExecution(LogLevel.Warning, $"ExecuteSpawnAsset[{executionId}]: OBS not connected - logging asset execution but not creating OBS sources");

                // Log the asset execution for debugging purposes
                LogAssetExecutionWithoutOBS(spawn, spawnAsset, baseAsset, contextData);
                generatedSourceGuid = string.Empty;
                return true; // Don't fail the entire spawn for OBS connection issues
            }

            // Resolve effective properties
            EffectivePropertiesResult effectiveProperties = ResolveEffectiveProperties(spawn, spawnAsset);

            // Create OBS source for the asset with retry logic
            bool sourceCreated = CreateOBSSource(baseAsset, effectiveProperties.Effective, generatedSourceGuid, out int sceneItemId);
            if (!sourceCreated)
            {
                LogExecution(LogLevel.Warning, $"ExecuteSpawnAsset[{executionId}]: Failed to create OBS source for asset '{spawnAsset.AssetId}' - continuing without OBS source");

                // Log the asset execution for debugging purposes
                LogAssetExecutionWithoutOBS(spawn, spawnAsset, baseAsset, contextData);
                generatedSourceGuid = string.Empty;
                return true; // Don't fail the entire spawn for OBS source creation issues
            }

            // Store the sceneItemId for cleanup timers if we have a valid one
            if (sceneItemId > 0)
            {
                lock (this.lockObject)
                {
                    // Store in both places for compatibility
                    this.sourceSceneItemIds[generatedSourceGuid] = sceneItemId;

                    // Also store in ActiveSpawnExecution for current execution tracking
                    var activeExecution = this.activeSpawns.Values.FirstOrDefault(e => e.SpawnId == spawn.Id);
                    if (activeExecution != null)
                    {
                        activeExecution.SourceSceneItemIds[generatedSourceGuid] = sceneItemId;
                    }
                }
            }

            // Apply asset properties to OBS source
            bool propertiesApplied = ApplyAssetPropertiesToOBS(baseAsset, effectiveProperties.Effective, generatedSourceGuid, sceneItemId);
            if (!propertiesApplied)
            {
                LogExecution(LogLevel.Warning, $"ExecuteSpawnAsset[{executionId}]: Failed to apply some properties to OBS source for asset '{spawnAsset.AssetId}' - continuing with default properties");
            }

            // Show the OBS source with retry logic
            bool sourceShown = ShowOBSSource(generatedSourceGuid);
            if (!sourceShown)
            {
                LogExecution(LogLevel.Warning, $"ExecuteSpawnAsset[{executionId}]: Failed to show OBS source for asset '{spawnAsset.AssetId}' - source created but not visible");
                // Don't fail here - the source was created, just not shown
            }

            // Handle asset-specific timing and cleanup
            double assetDuration = GetAssetDuration(spawn, spawnAsset);
            if (assetDuration > 0)
            {
                LogExecution(LogLevel.Info, $"ExecuteSpawnAsset[{executionId}]: Asset '{spawnAsset.AssetId}' will display for {assetDuration}ms");

                // Create cleanup timer for automatic source deletion after duration expires
                bool cleanupTimerCreated = CreateDurationCleanupTimer(generatedSourceGuid, assetDuration);
                if (cleanupTimerCreated)
                {
                    LogExecution(LogLevel.Info, $"ExecuteSpawnAsset[{executionId}]: Created cleanup timer for asset '{spawnAsset.AssetId}' (duration: {assetDuration}ms)");
                }
                else
                {
                    LogExecution(LogLevel.Warning, $"ExecuteSpawnAsset[{executionId}]: Failed to create cleanup timer for asset '{spawnAsset.AssetId}' - source will not be automatically cleaned up");
                    // Don't fail the entire asset execution for cleanup timer creation failure
                }
            }

            stopwatch.Stop();
            long executionTime = stopwatch.ElapsedMilliseconds;

            LogExecution(LogLevel.Info, $"ExecuteSpawnAsset[{executionId}]: Successfully executed asset '{spawnAsset.AssetId}' in {executionTime}ms (sceneItemId: {sceneItemId})");
            return true;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            long executionTime = stopwatch.ElapsedMilliseconds;

            Dictionary<string, object> context = new Dictionary<string, object>
            {
                ["spawnName"] = spawn?.Name,
                ["spawnId"] = spawn?.Id,
                ["assetId"] = spawnAsset?.AssetId,
                ["sourceGuid"] = generatedSourceGuid,
                ["triggerType"] = triggerType,
                ["executionTime"] = executionTime,
            };

            string errorMessage = CreateStructuredErrorMessage("ExecuteSpawnAsset", ex, context);
            LogExecution(LogLevel.Error, $"ExecuteSpawnAsset[{executionId}]: {errorMessage}");

            // Don't fail the entire spawn for individual asset errors
            LogExecution(LogLevel.Warning, $"ExecuteSpawnAsset[{executionId}]: Continuing spawn execution despite asset error");
            generatedSourceGuid = string.Empty;
            return true;
        }
    }

    /// <summary>
    /// Resolve effective properties for a spawn asset
    /// </summary>
    /// <param name="spawn">The parent spawn</param>
    /// <param name="spawnAsset">The spawn asset to resolve properties for</param>
    /// <returns>Effective properties result with source mapping</returns>
    private EffectivePropertiesResult ResolveEffectiveProperties(Spawn spawn, SpawnAsset spawnAsset)
    {
        // Convert C# types to match the TypeScript interface structure
        Dictionary<string, object> effective = new Dictionary<string, object>();
        Dictionary<string, string> sourceMap = new Dictionary<string, string>();

        // Get spawn default properties
        Dictionary<string, object> spawnDefaults = spawn.DefaultProperties != null
          ? ConvertAssetSettingsToDictionary(spawn.DefaultProperties)
          : new Dictionary<string, object>();

        // Get asset overrides
        Dictionary<string, object> overrides = spawnAsset.Overrides?.Properties != null
          ? ConvertAssetSettingsToDictionary(spawnAsset.Overrides.Properties)
          : new Dictionary<string, object>();

        // Resolve each property with precedence: override > spawn-default > none
        ResolveProperty("volume", overrides, spawnDefaults, effective, sourceMap);
        ResolveProperty("scale", overrides, spawnDefaults, effective, sourceMap);
        ResolveProperty("positionMode", overrides, spawnDefaults, effective, sourceMap);
        ResolveProperty("loop", overrides, spawnDefaults, effective, sourceMap);
        ResolveProperty("autoplay", overrides, spawnDefaults, effective, sourceMap);
        ResolveProperty("muted", overrides, spawnDefaults, effective, sourceMap);

        // Handle structured properties (dimensions, position)
        ResolveStructuredProperty("dimensions", overrides, spawnDefaults, effective, sourceMap);
        ResolveStructuredProperty("position", overrides, spawnDefaults, effective, sourceMap);

        return new EffectivePropertiesResult
        {
            Effective = effective,
            SourceMap = sourceMap,
        };
    }

    /// <summary>
    /// Resolve a simple property with precedence rules
    /// </summary>
    private void ResolveProperty(string propertyName, Dictionary<string, object> overrides, Dictionary<string, object> spawnDefaults, Dictionary<string, object> effective, Dictionary<string, string> sourceMap)
    {
        if (overrides.TryGetValue(propertyName, out object @override))
        {
            effective[propertyName] = @override;
            sourceMap[propertyName] = "override";
        }
        else if (spawnDefaults.TryGetValue(propertyName, out object @default))
        {
            effective[propertyName] = @default;
            sourceMap[propertyName] = "spawn-default";
        }
        else
        {
            sourceMap[propertyName] = "none";
        }
    }

    /// <summary>
    /// Resolve a structured property (dimensions, position) with deep merge
    /// </summary>
    private void ResolveStructuredProperty(string propertyName, Dictionary<string, object> overrides, Dictionary<string, object> spawnDefaults, Dictionary<string, object> effective, Dictionary<string, string> sourceMap)
    {
        object overrideVal = overrides.TryGetValue(propertyName, out object @override) ? @override : null;
        object spawnVal = spawnDefaults.TryGetValue(propertyName, out object @default) ? @default : null;

        object chosen = overrideVal ?? spawnVal;
        if (chosen != null)
        {
            effective[propertyName] = chosen;
            sourceMap[propertyName] = overrideVal != null ? "override" : "spawn-default";
        }
        else
        {
            sourceMap[propertyName] = "none";
        }
    }

    /// <summary>
    /// Convert AssetSettings to a dictionary for property resolution
    /// </summary>
    private Dictionary<string, object> ConvertAssetSettingsToDictionary(AssetSettings settings)
    {
        Dictionary<string, object> dict = new Dictionary<string, object>();

        if (settings.Volume.HasValue) dict["volume"] = settings.Volume.Value;
        if (settings.Scale.HasValue) dict["scale"] = settings.Scale.Value;
        if (!string.IsNullOrEmpty(settings.PositionMode)) dict["positionMode"] = settings.PositionMode;
        if (settings.Loop.HasValue) dict["loop"] = settings.Loop.Value;
        if (settings.Autoplay.HasValue) dict["autoplay"] = settings.Autoplay.Value;
        if (settings.Muted.HasValue) dict["muted"] = settings.Muted.Value;

        // Handle dimensions
        if (settings.Width.HasValue || settings.Height.HasValue)
        {
            Dictionary<string, object> dimensions = new Dictionary<string, object>();
            if (settings.Width.HasValue) dimensions["width"] = settings.Width.Value;
            if (settings.Height.HasValue) dimensions["height"] = settings.Height.Value;
            dict["dimensions"] = dimensions;
        }

        // Handle position
        if (settings.X.HasValue || settings.Y.HasValue)
        {
            Dictionary<string, object> position = new Dictionary<string, object>();
            if (settings.X.HasValue) position["x"] = settings.X.Value;
            if (settings.Y.HasValue) position["y"] = settings.Y.Value;
            dict["position"] = position;
        }

        return dict;
    }

    /// <summary>
    /// Get the duration for an asset (spawn default or asset override)
    /// </summary>
    private double GetAssetDuration(Spawn spawn, SpawnAsset spawnAsset)
    {
        // Check for asset-specific duration override
        if (spawnAsset.Overrides?.Duration.HasValue == true)
        {
            return spawnAsset.Overrides.Duration.Value;
        }

        // Use spawn default duration
        return spawn.Duration;
    }

    #endregion

    #region OBS Integration Methods

    /// <summary>
    /// Create an OBS source for a media asset
    /// </summary>
    /// <param name="asset">The media asset to create a source for</param>
    /// <param name="properties">The effective properties to apply</param>
    /// <param name="sourceName">The name for the OBS source</param>
    /// <param name="sceneItemId">The scene item ID returned by OBS (set to -1 on failure)</param>
    /// <returns>True if source was created successfully</returns>
    private bool CreateOBSSource(MediaAsset asset, Dictionary<string, object> properties, string sourceName, out int sceneItemId)
    {
        sceneItemId = -1; // Initialize out parameter

        // Validate input parameters
        Dictionary<string, object> parameters = new Dictionary<string, object>
        {
            ["asset"] = asset,
            ["sourceName"] = sourceName,
        };

        if (!ValidateInputParameters("CreateOBSSource", parameters))
        {
            return false;
        }

        // Use retry logic for the OBS operation
        int capturedSceneItemId = -1;
        bool result = ExecuteOBSOperationWithRetry($"CreateOBSSource-{sourceName}", () =>
        {
            try
            {
                LogExecution(LogLevel.Info, $"CreateOBSSource: Creating OBS source '{sourceName}' for asset '{asset.Name}' ({asset.Type})");

                // Validate OBS connection first
                if (!ValidateOBSConnection())
                {
                    LogExecution(LogLevel.Error, "CreateOBSSource: OBS connection validation failed");
                    return false;
                }

                // Check if source already exists
                if (OBSSourceExists(sourceName))
                {
                    LogExecution(LogLevel.Warning, $"CreateOBSSource: Source '{sourceName}' already exists, skipping creation");
                    return true;
                }

                // Determine source type based on asset
                string obsSourceType = GetOBSSourceType(asset);
                if (string.IsNullOrEmpty(obsSourceType))
                {
                    LogExecution(LogLevel.Error, $"CreateOBSSource: Unsupported asset type '{asset.Type}' for asset '{asset.Name}'");
                    return false;
                }

                // Get current scene
                string currentScene = GetCurrentOBSScene();
                if (string.IsNullOrEmpty(currentScene))
                {
                    LogExecution(LogLevel.Error, "CreateOBSSource: Could not determine current OBS scene");
                    return false;
                }

                // Build source settings
                Dictionary<string, object> sourceSettings = BuildOBSSourceSettings(asset, properties);

                // Create OBS WebSocket API request data for CreateInput
                Dictionary<string, object> createInputData = new Dictionary<string, object>
                {
                    ["sceneName"] = currentScene,
                    ["inputName"] = sourceName,
                    ["inputKind"] = obsSourceType,
                    ["inputSettings"] = sourceSettings,
                    ["sceneItemEnabled"] = true
                };

                // Send the request to OBS using the correct WebSocket API
                string response = CPH.ObsSendRaw("CreateInput", JsonConvert.SerializeObject(createInputData));
                if (string.IsNullOrEmpty(response))
                {
                    LogExecution(LogLevel.Error, $"CreateOBSSource: No response from OBS for source creation '{sourceName}'");
                    return false;
                }

                // Validate response before parsing
                if (string.IsNullOrWhiteSpace(response))
                {
                    LogExecution(LogLevel.Error, $"CreateOBSSource: Empty response from OBS for source creation '{sourceName}'");
                    return false;
                }

                // Parse response to check for success
                Dictionary<string, object> responseData;
                try
                {
                    responseData = JsonConvert.DeserializeObject<Dictionary<string, object>>(response);
                    // Debug logging to see actual response structure
                    LogExecution(LogLevel.Info, $"CreateOBSSource: OBS response structure: {JsonConvert.SerializeObject(responseData, Formatting.Indented)}");
                }
                catch (JsonException ex)
                {
                    LogExecution(LogLevel.Error, $"CreateOBSSource: Invalid JSON response from OBS for source creation '{sourceName}': {ex.Message}");
                    return false;
                }
                // Check for requestStatus wrapper (OBS WebSocket protocol format)
                if (responseData.ContainsKey("requestStatus") && responseData["requestStatus"] is Dictionary<string, object> status)
                {
                    bool success = status.ContainsKey("result") && status["result"] is bool successResult && successResult;
                    if (success)
                    {
                        // Extract sceneItemId from responseData if available
                        if (responseData.ContainsKey("responseData") && responseData["responseData"] is Dictionary<string, object> responseDataInner)
                        {
                            LogExecution(LogLevel.Info, $"CreateOBSSource: responseDataInner structure: {JsonConvert.SerializeObject(responseDataInner, Formatting.Indented)}");
                            if (responseDataInner.ContainsKey("sceneItemId") && responseDataInner["sceneItemId"] is int itemId)
                            {
                                capturedSceneItemId = itemId;
                                LogExecution(LogLevel.Info, $"CreateOBSSource: Successfully extracted sceneItemId: {capturedSceneItemId}");
                            }
                            else
                            {
                                LogExecution(LogLevel.Warning, $"CreateOBSSource: sceneItemId not found in responseDataInner or not an int");
                            }
                        }
                        else
                        {
                            LogExecution(LogLevel.Warning, $"CreateOBSSource: responseData not found or not a dictionary");
                        }
                        LogExecution(LogLevel.Info, $"CreateOBSSource: Successfully created OBS source '{sourceName}' (sceneItemId: {capturedSceneItemId})");
                        return true;
                    }
                    else
                    {
                        // Extract error information from OBS response
                        string errorMessage = "Unknown error";
                        if (status.ContainsKey("comment") && !string.IsNullOrEmpty(status["comment"]?.ToString()))
                        {
                            errorMessage = status["comment"].ToString();
                        }

                        // Include error code if available
                        if (status.TryGetValue("code", out object statu))
                        {
                            errorMessage += $" (Code: {statu})";
                        }

                        LogExecution(LogLevel.Error, $"CreateOBSSource: Failed to create OBS source '{sourceName}': {errorMessage}");
                        return false;
                    }
                }
                // Check for direct response format (as per documentation example)
                else if (responseData.ContainsKey("inputUuid") || responseData.ContainsKey("sceneItemId"))
                {
                    // Extract sceneItemId from direct response
                    if (responseData.ContainsKey("sceneItemId"))
                    {
                        object sceneItemIdObj = responseData["sceneItemId"];

                        // Try different type conversions
                        if (sceneItemIdObj is int intValue)
                        {
                            capturedSceneItemId = intValue;
                        }
                        else if (sceneItemIdObj is long longValue)
                        {
                            capturedSceneItemId = (int)longValue;
                        }
                        else if (sceneItemIdObj is double doubleValue)
                        {
                            capturedSceneItemId = (int)doubleValue;
                        }
                        else if (int.TryParse(sceneItemIdObj?.ToString(), out int parsedValue))
                        {
                            capturedSceneItemId = parsedValue;
                        }
                    }
                    // This appears to be a successful response with the created source data
                    LogExecution(LogLevel.Info, $"CreateOBSSource: Successfully created OBS source '{sourceName}' (direct response format, sceneItemId: {capturedSceneItemId})");
                    return true;
                }

                LogExecution(LogLevel.Error, $"CreateOBSSource: Invalid response format from OBS for source creation '{sourceName}' - no recognized success indicators found");
                return false;
            }
            catch (Exception ex)
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                    ["assetName"] = asset?.Name,
                    ["assetType"] = asset?.Type,
                };

                string errorMessage = CreateStructuredErrorMessage("CreateOBSSource", ex, context);
                LogExecution(LogLevel.Error, $"CreateOBSSource: {errorMessage}");
                return false;
            }
        });

        // Set the out parameter with the captured value
        sceneItemId = capturedSceneItemId;
        return result;
    }

    /// <summary>
    /// Apply asset properties to an OBS source
    /// </summary>
    /// <param name="asset">The media asset</param>
    /// <param name="properties">The effective properties to apply</param>
    /// <param name="sourceName">The name of the OBS source</param>
    /// <param name="sceneItemId">The scene item ID for transform operations</param>
    /// <returns>True if properties were applied successfully</returns>
    private bool ApplyAssetPropertiesToOBS(MediaAsset asset, Dictionary<string, object> properties, string sourceName, int sceneItemId)
    {
        try
        {
            LogExecution(LogLevel.Info, $"ApplyAssetPropertiesToOBS: Applying properties to source '{sourceName}'");

            string currentScene = GetCurrentOBSScene();
            if (string.IsNullOrEmpty(currentScene))
            {
                LogExecution(LogLevel.Error, "ApplyAssetPropertiesToOBS: Could not determine current OBS scene");
                return false;
            }

            // Apply input-specific properties using SetInputSettings
            Dictionary<string, object> inputSettingsRequest = BuildSetInputSettingsRequest(sourceName, properties);
            if (inputSettingsRequest != null)
            {
                bool inputSuccess = ExecuteOBSOperationWithRetry($"SetInputSettings-{sourceName}", () =>
                {
                    string response = CPH.ObsSendRaw("SetInputSettings", JsonConvert.SerializeObject(inputSettingsRequest));
                    return !string.IsNullOrEmpty(response);
                });

                if (!inputSuccess)
                {
                    LogExecution(LogLevel.Warning, $"ApplyAssetPropertiesToOBS: Failed to apply input settings for source '{sourceName}'");
                }
            }

            // Apply scene item transform properties using SetSceneItemTransform
            Dictionary<string, object> sceneItemTransformRequest = BuildSetSceneItemTransformRequest(sceneItemId, properties, currentScene);
            if (sceneItemTransformRequest != null)
            {
                bool transformSuccess = ExecuteOBSOperationWithRetry($"SetSceneItemTransform-{sourceName}", () =>
                {
                    string response = CPH.ObsSendRaw("SetSceneItemTransform", JsonConvert.SerializeObject(sceneItemTransformRequest));
                    return !string.IsNullOrEmpty(response);
                });

                if (!transformSuccess)
                {
                    LogExecution(LogLevel.Warning, $"ApplyAssetPropertiesToOBS: Failed to apply scene item transform for source '{sourceName}'");
                }
            }

            LogExecution(LogLevel.Info, $"ApplyAssetPropertiesToOBS: No properties to apply to source '{sourceName}'");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ApplyAssetPropertiesToOBS: Error applying properties to source '{sourceName}': {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Show an OBS source
    /// </summary>
    /// <param name="sourceName">The name of the source to show</param>
    /// <returns>True if source was shown successfully</returns>
    private bool ShowOBSSource(string sourceName)
    {
        // Validate input parameters
        Dictionary<string, object> parameters = new Dictionary<string, object>
        {
            ["sourceName"] = sourceName,
        };

        if (!ValidateInputParameters("ShowOBSSource", parameters))
        {
            return false;
        }

        // Use retry logic for the OBS operation
        return ExecuteOBSOperationWithRetry($"ShowOBSSource-{sourceName}", () =>
        {
            try
            {
                LogExecution(LogLevel.Info, $"ShowOBSSource: Showing OBS source '{sourceName}'");

                // Get current scene for the OBS operation
                string currentScene = GetCurrentOBSScene();
                if (string.IsNullOrEmpty(currentScene))
                {
                    LogExecution(LogLevel.Error, "ShowOBSSource: Could not determine current OBS scene");
                    return false;
                }

                // Use built-in Streamer.bot method to show the source
                try
                {
                    CPH.ObsShowSource(currentScene, sourceName);
                    LogExecution(LogLevel.Info, $"ShowOBSSource: Successfully showed OBS source '{sourceName}'");
                    return true;
                }
                catch (Exception ex)
                {
                    LogExecution(LogLevel.Error, $"ShowOBSSource: Failed to show OBS source '{sourceName}': {ex.Message}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                };

                string errorMessage = CreateStructuredErrorMessage("ShowOBSSource", ex, context);
                LogExecution(LogLevel.Error, $"ShowOBSSource: {errorMessage}");
                return false;
            }
        });
    }

    /// <summary>
    /// Hide an OBS source
    /// </summary>
    /// <param name="sourceName">The name of the source to hide</param>
    /// <returns>True if source was hidden successfully</returns>
    private bool HideOBSSource(string sourceName)
    {
        // Validate input parameters
        Dictionary<string, object> parameters = new Dictionary<string, object>
        {
            ["sourceName"] = sourceName,
        };

        if (!ValidateInputParameters("HideOBSSource", parameters))
        {
            return false;
        }

        // Use retry logic for the OBS operation
        return ExecuteOBSOperationWithRetry($"HideOBSSource-{sourceName}", () =>
        {
            try
            {
                LogExecution(LogLevel.Info, $"HideOBSSource: Hiding OBS source '{sourceName}'");

                // Get current scene for the OBS operation
                string currentScene = GetCurrentOBSScene();
                if (string.IsNullOrEmpty(currentScene))
                {
                    LogExecution(LogLevel.Error, "HideOBSSource: Could not determine current OBS scene");
                    return false;
                }

                // Use built-in Streamer.bot method to hide the source
                try
                {
                    CPH.ObsHideSource(currentScene, sourceName);
                    LogExecution(LogLevel.Info, $"HideOBSSource: Successfully hid OBS source '{sourceName}'");
                    return true;
                }
                catch (Exception ex)
                {
                    LogExecution(LogLevel.Error, $"HideOBSSource: Failed to hide OBS source '{sourceName}': {ex.Message}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                };

                string errorMessage = CreateStructuredErrorMessage("HideOBSSource", ex, context);
                LogExecution(LogLevel.Error, $"HideOBSSource: {errorMessage}");
                return false;
            }
        });
    }

    /// <summary>
    /// Delete an OBS source
    /// </summary>
    /// <param name="sourceName">The name of the source to delete</param>
    /// <param name="sceneItemId">The scene item ID of the source to delete</param>
    /// <returns>True if source was deleted successfully</returns>
    private bool DeleteOBSSource(string sourceName, int sceneItemId)
    {
        // Validate input parameters
        Dictionary<string, object> parameters = new Dictionary<string, object>
        {
            ["sourceName"] = sourceName,
            ["sceneItemId"] = sceneItemId,
        };

        if (!ValidateInputParameters("DeleteOBSSource", parameters))
        {
            return false;
        }

        // Validate sceneItemId parameter
        if (sceneItemId <= 0)
        {
            LogExecution(LogLevel.Error, $"DeleteOBSSource: Invalid sceneItemId '{sceneItemId}' for source '{sourceName}' - must be greater than 0");
            return false;
        }

        // Use retry logic for the OBS operation
        return ExecuteOBSOperationWithRetry($"DeleteOBSSource-{sourceName}", () =>
        {
            try
            {
                LogExecution(LogLevel.Info, $"DeleteOBSSource: Deleting OBS source '{sourceName}' (sceneItemId: {sceneItemId})");

                string currentScene = GetCurrentOBSScene();
                if (string.IsNullOrEmpty(currentScene))
                {
                    LogExecution(LogLevel.Error, "DeleteOBSSource: Could not determine current OBS scene");
                    return false;
                }

                // Create OBS request data to delete the source
                Dictionary<string, object> deleteSourceData = new Dictionary<string, object>
                {
                    ["sceneName"] = currentScene,
                    ["sceneItemId"] = sceneItemId,
                };

                // Send the request to OBS
                string response = CPH.ObsSendRaw("RemoveSceneItem", JsonConvert.SerializeObject(deleteSourceData));
                if (string.IsNullOrEmpty(response))
                {
                    LogExecution(LogLevel.Error, $"DeleteOBSSource: No response from OBS for deleting source '{sourceName}'");
                    return false;
                }

                // Validate response before parsing
                if (string.IsNullOrWhiteSpace(response))
                {
                    LogExecution(LogLevel.Error, $"DeleteOBSSource: Empty response from OBS for deleting source '{sourceName}'");
                    return false;
                }

                // Parse response to check for success
                Dictionary<string, object> responseData;
                try
                {
                    responseData = JsonConvert.DeserializeObject<Dictionary<string, object>>(response);
                }
                catch (JsonException ex)
                {
                    LogExecution(LogLevel.Error, $"DeleteOBSSource: Invalid JSON response from OBS for deleting source '{sourceName}': {ex.Message}");
                    return false;
                }
                // Check for requestStatus wrapper (OBS WebSocket protocol format)
                if (responseData.ContainsKey("requestStatus") && responseData["requestStatus"] is Dictionary<string, object> status)
                {
                    bool result = status.ContainsKey("result") && status["result"] is bool success && success;
                    if (result)
                    {
                        LogExecution(LogLevel.Info, $"DeleteOBSSource: Successfully deleted OBS source '{sourceName}'");
                        return true;
                    }
                    else
                    {
                        // Extract error information from OBS response
                        string errorMessage = "Unknown error";
                        if (status.ContainsKey("comment") && !string.IsNullOrEmpty(status["comment"]?.ToString()))
                        {
                            errorMessage = status["comment"].ToString();
                        }

                        // Include error code if available
                        if (status.TryGetValue("code", out object statu))
                        {
                            errorMessage += $" (Code: {statu})";
                        }

                        LogExecution(LogLevel.Error, $"DeleteOBSSource: Failed to delete OBS source '{sourceName}': {errorMessage}");
                        return false;
                    }
                }
                // Check for direct response format (as per documentation example)
                else if (responseData.ContainsKey("sceneItemId") || responseData.Count == 0)
                {
                    // This appears to be a successful response (empty response or with sceneItemId)
                    LogExecution(LogLevel.Info, $"DeleteOBSSource: Successfully deleted OBS source '{sourceName}' (direct response format)");
                    return true;
                }

                LogExecution(LogLevel.Error, $"DeleteOBSSource: Invalid response format from OBS for deleting source '{sourceName}' - no recognized success indicators found");
                return false;
            }
            catch (Exception ex)
            {
                Dictionary<string, object> context = new Dictionary<string, object>
                {
                    ["sourceName"] = sourceName,
                };

                string errorMessage = CreateStructuredErrorMessage("DeleteOBSSource", ex, context);
                LogExecution(LogLevel.Error, $"DeleteOBSSource: {errorMessage}");
                return false;
            }
        });
    }

    /// <summary>
    /// Get the OBS source type for a media asset
    /// </summary>
    /// <param name="asset">The media asset</param>
    /// <returns>The corresponding OBS source type</returns>
    private string GetOBSSourceType(MediaAsset asset)
    {
        // URL-based media always uses browser_source
        if (asset.IsUrl)
        {
            return "browser_source";
        }

        // Local files use appropriate source type based on asset type
        switch (asset.Type?.ToLowerInvariant())
        {
            case "image":
                return "image_source";
            case "video":
            case "audio":
                return "ffmpeg_source";
            default:
                return null;
        }
    }

    /// <summary>
    /// Build OBS source settings for a media asset
    /// </summary>
    /// <param name="asset">The media asset</param>
    /// <param name="properties">The effective properties</param>
    /// <returns>Dictionary of OBS source settings</returns>
    private Dictionary<string, object> BuildOBSSourceSettings(MediaAsset asset, Dictionary<string, object> properties)
    {
        Dictionary<string, object> settings = new Dictionary<string, object>();

        // Set the file path or URL based on source type
        if (asset.IsUrl)
        {
            // URL-based media uses browser_source with "url" parameter
            settings["url"] = asset.Path;
        }
        else
        {
            // Local files use appropriate parameter based on source type
            if (asset.Type?.ToLowerInvariant() == "image")
            {
                // image_source uses "file" parameter
                settings["file"] = asset.Path;
            }
            else
            {
                // ffmpeg_source uses "local_file" parameter
                settings["local_file"] = asset.Path;
            }
        }

        // Apply media-specific settings
        if (asset.Type == "video" || asset.Type == "audio")
        {
            settings["is_local_file"] = !asset.IsUrl;
            settings["looping"] = properties.ContainsKey("loop") && properties["loop"] is bool loop ? loop : false;
            settings["restart_on_activate"] = true;
        }

        return settings;
    }

    /// <summary>
    /// Build SetInputSettings request for input-specific properties
    /// </summary>
    /// <param name="sourceName">The name of the OBS source</param>
    /// <param name="properties">The effective properties</param>
    /// <returns>Dictionary containing SetInputSettings request data</returns>
    private Dictionary<string, object> BuildSetInputSettingsRequest(string sourceName, Dictionary<string, object> properties)
    {
        Dictionary<string, object> inputSettings = new Dictionary<string, object>();

        // Map input-specific properties to OBS API structure
        if (properties.ContainsKey("loop") && properties["loop"] is bool loop)
        {
            inputSettings["looping"] = loop;
        }

        if (properties.ContainsKey("muted") && properties["muted"] is bool muted)
        {
            inputSettings["muted"] = muted;
        }

        if (properties.ContainsKey("autoplay") && properties["autoplay"] is bool autoplay)
        {
            inputSettings["autoplay"] = autoplay;
        }

        // Only create request if there are input settings to apply
        if (inputSettings.Count == 0)
        {
            return null;
        }

        // Create SetInputSettings request following OBS WebSocket API
        Dictionary<string, object> request = new Dictionary<string, object>
        {
            ["requestType"] = "SetInputSettings",
            ["inputName"] = sourceName,
            ["inputSettings"] = inputSettings,
            ["overlay"] = false
        };

        return request;
    }

    /// <summary>
    /// Build SetSceneItemTransform request for scene item properties
    /// </summary>
    /// <param name="sceneItemId">The scene item ID</param>
    /// <param name="properties">The effective properties</param>
    /// <param name="currentScene">The current OBS scene name</param>
    /// <returns>Dictionary containing SetSceneItemTransform request data</returns>
    private Dictionary<string, object> BuildSetSceneItemTransformRequest(int sceneItemId, Dictionary<string, object> properties, string currentScene)
    {
        Dictionary<string, object> request = new Dictionary<string, object>
        {
            ["requestType"] = "SetSceneItemTransform",
            ["sceneName"] = currentScene,
            ["sceneItemId"] = sceneItemId
        };

        // Build sceneItemTransform object
        Dictionary<string, object> sceneItemTransform = new Dictionary<string, object>();
        bool hasTransformProperties = false;

        // Handle position
        if (properties.ContainsKey("position") && properties["position"] is Dictionary<string, object> position)
        {
            double x = position.ContainsKey("x") && position["x"] is double xVal ? xVal : 0;
            double y = position.ContainsKey("y") && position["y"] is double yVal ? yVal : 0;

            sceneItemTransform["positionX"] = x;
            sceneItemTransform["positionY"] = y;
            hasTransformProperties = true;
        }

        // Handle scale - support both uniform (double) and non-uniform (ScaleObject) scaling
        if (properties.ContainsKey("scale"))
        {
            if (properties["scale"] is double scale)
            {
                // Uniform scaling (backward compatibility)
                sceneItemTransform["scaleX"] = scale;
                sceneItemTransform["scaleY"] = scale;
                hasTransformProperties = true;
            }
            else if (properties["scale"] is Dictionary<string, object> scaleObj)
            {
                // Non-uniform scaling
                double scaleX = scaleObj.ContainsKey("x") && scaleObj["x"] is double xVal ? xVal : 1.0;
                double scaleY = scaleObj.ContainsKey("y") && scaleObj["y"] is double yVal ? yVal : 1.0;

                sceneItemTransform["scaleX"] = scaleX;
                sceneItemTransform["scaleY"] = scaleY;
                hasTransformProperties = true;
            }
        }

        // Handle rotation
        if (properties.ContainsKey("rotation") && properties["rotation"] is double rotation)
        {
            // Convert degrees to radians for OBS API
            double rotationRadians = rotation * Math.PI / 180.0;
            sceneItemTransform["rotation"] = rotationRadians;
            hasTransformProperties = true;
        }

        // Handle crop controls
        if (properties.ContainsKey("cropLeft") && properties["cropLeft"] is double cropLeft)
        {
            sceneItemTransform["cropLeft"] = cropLeft;
            hasTransformProperties = true;
        }
        if (properties.ContainsKey("cropTop") && properties["cropTop"] is double cropTop)
        {
            sceneItemTransform["cropTop"] = cropTop;
            hasTransformProperties = true;
        }
        if (properties.ContainsKey("cropRight") && properties["cropRight"] is double cropRight)
        {
            sceneItemTransform["cropRight"] = cropRight;
            hasTransformProperties = true;
        }
        if (properties.ContainsKey("cropBottom") && properties["cropBottom"] is double cropBottom)
        {
            sceneItemTransform["cropBottom"] = cropBottom;
            hasTransformProperties = true;
        }

        // Handle alignment
        if (properties.ContainsKey("alignment") && properties["alignment"] is int alignment)
        {
            sceneItemTransform["alignment"] = alignment;
            hasTransformProperties = true;
        }
        else if (hasTransformProperties && !sceneItemTransform.ContainsKey("alignment"))
        {
            // Set default alignment if not specified
            sceneItemTransform["alignment"] = 0;
        }

        // Handle bounds type
        if (properties.ContainsKey("boundsType") && properties["boundsType"] is string boundsType)
        {
            sceneItemTransform["boundsType"] = boundsType;
            hasTransformProperties = true;
        }

        // Handle bounds alignment
        if (properties.ContainsKey("boundsAlignment") && properties["boundsAlignment"] is int boundsAlignment)
        {
            sceneItemTransform["boundsAlignment"] = boundsAlignment;
            hasTransformProperties = true;
        }

        // Handle dimensions (bounds) - enhanced to work with bounds type
        if (properties.ContainsKey("dimensions") && properties["dimensions"] is Dictionary<string, object> dimensions)
        {
            double width = dimensions.ContainsKey("width") && dimensions["width"] is double w ? w : 0;
            double height = dimensions.ContainsKey("height") && dimensions["height"] is double h ? h : 0;

            if (width > 0 && height > 0)
            {
                // Use specified bounds type or default to ScaleInner
                if (!sceneItemTransform.ContainsKey("boundsType"))
                {
                    sceneItemTransform["boundsType"] = OBSBoundsTypeStrings[OBSBoundsType.ScaleInner];
                }
                if (!sceneItemTransform.ContainsKey("boundsAlignment"))
                {
                    sceneItemTransform["boundsAlignment"] = 0;
                }
                sceneItemTransform["boundsWidth"] = width;
                sceneItemTransform["boundsHeight"] = height;
                hasTransformProperties = true;
            }
        }

        // Handle volume (audio level) - Note: This might not be part of sceneItemTransform
        if (properties.ContainsKey("volume") && properties["volume"] is double volume)
        {
            // Clamp volume to 0-1 range for OBS
            double clampedVolume = Math.Max(0, Math.Min(1, volume / 100.0));
            sceneItemTransform["audioLevel"] = clampedVolume;
            hasTransformProperties = true;
        }

        // Add sceneItemTransform to request if we have properties
        if (hasTransformProperties)
        {
            request["sceneItemTransform"] = sceneItemTransform;
        }

        // Only return request if there are transform properties to apply
        if (!hasTransformProperties)
        {
            return null;
        }

        return request;
    }

    /// <summary>
    /// Get the current OBS scene name
    /// </summary>
    /// <returns>The current scene name</returns>
    private string GetCurrentOBSScene()
    {
        try
        {
            // Use built-in Streamer.bot method to get current scene
            string sceneName = CPH.ObsGetCurrentScene();

            if (string.IsNullOrEmpty(sceneName))
            {
                LogExecution(LogLevel.Warning, "GetCurrentOBSScene: No scene name returned from OBS");
                return "Default";
            }

            LogExecution(LogLevel.Info, $"GetCurrentOBSScene: Current scene is '{sceneName}'");
            return sceneName;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Warning, $"GetCurrentOBSScene: Could not get current scene: {ex.Message}");
        }

        // Fallback to default scene
        return "Default";
    }

    /// <summary>
    /// Validate OBS connection and get basic information
    /// </summary>
    /// <returns>True if OBS is connected and responsive</returns>
    private bool ValidateOBSConnection()
    {
        // OBS connection validation temporarily disabled
        // TODO: Implement more reliable OBS connection checking
        LogExecution(LogLevel.Info, "ValidateOBSConnection: OBS connection validation disabled - proceeding with execution");
        return true;

        /*
        try
        {
              LogExecution(LogLevel.Info, "ValidateOBSConnection: Checking OBS connection");

          // Use built-in Streamer.bot method to check OBS connection
          bool isConnected = CPH.ObsIsConnected();

          if (isConnected)
          {
                LogExecution(LogLevel.Info, "ValidateOBSConnection: OBS connection is valid and responsive");
            return true;
          }
          else
          {
                LogExecution(LogLevel.Error, "ValidateOBSConnection: OBS is not connected");
            return false;
          }
        }
        catch (Exception ex)
        {
              LogExecution(LogLevel.Error, $"ValidateOBSConnection: Error validating OBS connection: {ex.Message}");
          return false;
        }
        */
    }

    /// <summary>
    /// Execute multiple OBS operations in a single batch for efficiency
    /// </summary>
    /// <param name="operations">List of OBS operations to execute</param>
    /// <returns>True if all operations succeeded</returns>
    private bool ExecuteOBSBatchOperations(List<Dictionary<string, object>> operations)
    {
        try
        {
            if (operations == null || operations.Count == 0)
            {
                LogExecution(LogLevel.Info, "ExecuteOBSBatchOperations: No operations to execute");
                return true;
            }

            // Log operation types being executed
            List<string> operationTypes = new List<string>();
            foreach (var operation in operations)
            {
                if (operation.ContainsKey("inputName") && operation.ContainsKey("inputSettings"))
                {
                    operationTypes.Add("SetInputSettings");
                }
                else if (operation.ContainsKey("sceneName") && operation.ContainsKey("item"))
                {
                    operationTypes.Add("SetSceneItemTransform");
                }
                else
                {
                    operationTypes.Add("Unknown");
                }
            }

            LogExecution(LogLevel.Info, $"ExecuteOBSBatchOperations: Executing {operations.Count} OBS operations in batch - Types: {string.Join(", ", operationTypes.Distinct())}");

            // Debug logging to see what we're sending
            string batchRequestJson = JsonConvert.SerializeObject(operations, Formatting.Indented);
            LogExecution(LogLevel.Info, $"ExecuteOBSBatchOperations: Batch request being sent to OBS: {batchRequestJson}");

            // Send batch request to OBS
            string batchResponse = CPH.ObsSendBatchRaw(batchRequestJson);
            if (string.IsNullOrEmpty(batchResponse))
            {
                LogExecution(LogLevel.Error, "ExecuteOBSBatchOperations: No response from OBS for batch operations");
                return false;
            }

            // Debug logging to see what CPH.ObsSendBatchRaw actually returns
            LogExecution(LogLevel.Info, $"ExecuteOBSBatchOperations: Raw batch response from CPH.ObsSendBatchRaw: {batchResponse}");

            // Validate batch response before parsing
            if (string.IsNullOrWhiteSpace(batchResponse))
            {
                LogExecution(LogLevel.Error, "ExecuteOBSBatchOperations: Empty response from OBS for batch operations");
                return false;
            }

            // Parse batch response to check for success
            List<Dictionary<string, object>> responses;
            try
            {
                // CPH.ObsSendBatchRaw returns the full WebSocket message with 'op' and 'd' fields
                Dictionary<string, object> fullResponse = JsonConvert.DeserializeObject<Dictionary<string, object>>(batchResponse);

                if (fullResponse.ContainsKey("d") && fullResponse["d"] is Dictionary<string, object> dData)
                {
                    if (dData.ContainsKey("results") && dData["results"] is List<object> resultsList)
                    {
                        // Convert List<object> to List<Dictionary<string, object>>
                        responses = new List<Dictionary<string, object>>();
                        foreach (var result in resultsList)
                        {
                            if (result is Dictionary<string, object> resultDict)
                            {
                                responses.Add(resultDict);
                            }
                            else
                            {
                                LogExecution(LogLevel.Warning, $"ExecuteOBSBatchOperations: Invalid result item type: {result?.GetType()}");
                            }
                        }
                    }
                    else
                    {
                        LogExecution(LogLevel.Error, "ExecuteOBSBatchOperations: 'results' array not found in OBS batch response");
                        return false;
                    }
                }
                else
                {
                    LogExecution(LogLevel.Error, "ExecuteOBSBatchOperations: 'd' object not found in OBS batch response");
                    return false;
                }
            }
            catch (JsonException ex)
            {
                LogExecution(LogLevel.Error, $"ExecuteOBSBatchOperations: Invalid JSON response from OBS for batch operations: {ex.Message}");
                return false;
            }

            bool allSuccessful = true;
            int operationIndex = 0;

            foreach (Dictionary<string, object> response in responses)
            {
                string operationType = operationIndex < operationTypes.Count ? operationTypes[operationIndex] : "Unknown";

                if (response.ContainsKey("requestStatus") && response["requestStatus"] is Dictionary<string, object> status)
                {
                    bool success = status.ContainsKey("result") && status["result"] is bool result && result;
                    if (!success)
                    {
                        allSuccessful = false;
                        string error = status.TryGetValue("comment", out object statusComment) ? statusComment.ToString() : "Unknown error";
                        LogExecution(LogLevel.Warning, $"ExecuteOBSBatchOperations: {operationType} operation failed: {error}");
                    }
                    else
                    {
                        LogExecution(LogLevel.Info, $"ExecuteOBSBatchOperations: {operationType} operation succeeded");
                    }
                }
                else
                {
                    // Handle direct response format (no requestStatus wrapper)
                    if (response.ContainsKey("inputUuid") || response.ContainsKey("sceneItemId") || response.Count == 0)
                    {
                        LogExecution(LogLevel.Info, $"ExecuteOBSBatchOperations: {operationType} operation succeeded (direct response)");
                    }
                    else
                    {
                        allSuccessful = false;
                        LogExecution(LogLevel.Warning, $"ExecuteOBSBatchOperations: {operationType} operation failed - unexpected response format");
                    }
                }

                operationIndex++;
            }

            LogExecution(LogLevel.Info, $"ExecuteOBSBatchOperations: Batch operations completed - Success: {allSuccessful}");
            return allSuccessful;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ExecuteOBSBatchOperations: Error executing batch operations: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Check if an OBS source exists in the current scene
    /// </summary>
    /// <param name="sourceName">The name of the source to check</param>
    /// <returns>True if source exists</returns>
    private bool OBSSourceExists(string sourceName)
    {
        try
        {
            string currentScene = GetCurrentOBSScene();
            if (string.IsNullOrEmpty(currentScene))
            {
                LogExecution(LogLevel.Error, "OBSSourceExists: Could not determine current OBS scene");
                return false;
            }

            // Create OBS request data to get scene items
            Dictionary<string, object> getSceneItemsData = new Dictionary<string, object>
            {
                ["sceneName"] = currentScene,
            };

            // Send the request to OBS
            string response = CPH.ObsSendRaw("GetSceneItemList", JsonConvert.SerializeObject(getSceneItemsData));
            if (string.IsNullOrEmpty(response))
            {
                LogExecution(LogLevel.Error, $"OBSSourceExists: No response from OBS for checking source '{sourceName}'");
                return false;
            }

            // Validate response before parsing
            if (string.IsNullOrWhiteSpace(response))
            {
                LogExecution(LogLevel.Error, $"OBSSourceExists: Empty response from OBS for checking source '{sourceName}'");
                return false;
            }

            // Parse response to check for source existence
            Dictionary<string, object> responseData;
            try
            {
                responseData = JsonConvert.DeserializeObject<Dictionary<string, object>>(response);
            }
            catch (JsonException ex)
            {
                LogExecution(LogLevel.Error, $"OBSSourceExists: Invalid JSON response from OBS for checking source '{sourceName}': {ex.Message}");
                return false;
            }
            if (responseData.ContainsKey("requestStatus") && responseData["requestStatus"] is Dictionary<string, object> status)
            {
                bool success = status.ContainsKey("result") && status["result"] is bool result && result;
                if (success && responseData.ContainsKey("responseData") && responseData["responseData"] is Dictionary<string, object> responseDataDict)
                {
                    if (responseDataDict.ContainsKey("sceneItems") && responseDataDict["sceneItems"] is List<object> sceneItems)
                    {
                        foreach (object item in sceneItems)
                        {
                            if (item is Dictionary<string, object> sceneItem)
                            {
                                if (sceneItem.ContainsKey("sourceName") && sceneItem["sourceName"] is string itemName && itemName == sourceName)
                                {
                                    LogExecution(LogLevel.Info, $"OBSSourceExists: Source '{sourceName}' exists in scene '{currentScene}'");
                                    return true;
                                }
                            }
                        }
                    }
                }
            }

            LogExecution(LogLevel.Info, $"OBSSourceExists: Source '{sourceName}' does not exist in scene '{currentScene}'");
            return false;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"OBSSourceExists: Error checking if source '{sourceName}' exists: {ex.Message}");
            return false;
        }
    }

    #endregion

    #region Supporting Classes

    /// <summary>
    /// Result of effective property resolution
    /// </summary>
    public class EffectivePropertiesResult
    {
        public Dictionary<string, object> Effective { get; set; } = new Dictionary<string, object>();
        public Dictionary<string, string> SourceMap { get; set; } = new Dictionary<string, string>();
    }

    #endregion

    public bool SetMediaSpawnerConfig()
    {
        if (!CPH.TryGetArg("mediaSpawnerConfigValue", out string mediaSpawnerConfigValue) || string.IsNullOrWhiteSpace(mediaSpawnerConfigValue))
        {
            LogExecution(LogLevel.Warning, "SetMediaSpawnerConfig: Missing required argument 'mediaSpawnerConfigValue'");
            return false;
        }

        try
        {
            // Set the global variables
            CPH.SetGlobalVar(this.mediaSpawnerConfigVarName, mediaSpawnerConfigValue, persisted: true);
            CPH.SetGlobalVar(this.mediaSpawnerShaVarName, ComputeSha256(mediaSpawnerConfigValue), persisted: true);

            // Handle the configuration update (invalidate cache, reload, recreate timers)
            if (!HandleConfigurationUpdate())
            {
                LogExecution(LogLevel.Error, "SetMediaSpawnerConfig: Failed to handle configuration update");
                return false;
            }

            LogExecution(LogLevel.Info, $"SetMediaSpawnerConfig: Successfully set MediaSpawner config and updated system (persist: true)");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"SetMediaSpawnerConfig: Failed to set MediaSpawner config: {ex.Message}");
            return false;
        }
    }

    private static string ComputeSha256(string input)
    {
        using (SHA256 sha256 = SHA256.Create())
        {
            byte[] inputBytes = Encoding.UTF8.GetBytes(input);
            byte[] hashBytes = sha256.ComputeHash(inputBytes);
            return Convert.ToBase64String(hashBytes);
        }
    }


    /// <summary>
    /// Load MediaSpawner configuration from global variables with caching
    /// </summary>
    /// <returns>True if configuration loaded successfully, false otherwise</returns>
    public bool LoadMediaSpawnerConfig()
    {
        lock (this.lockObject)
        {
            try
            {
                // Check if cached config is still valid
                if (this.cachedConfig != null && IsConfigCacheValid())
                {
                    LogExecution(LogLevel.Info, "LoadMediaSpawnerConfig: Using cached configuration");
                    return true;
                }

                string configJson = CPH.GetGlobalVar<string>(this.mediaSpawnerConfigVarName);
                if (string.IsNullOrWhiteSpace(configJson))
                {
                    LogExecution(LogLevel.Error, "LoadMediaSpawnerConfig: No MediaSpawner configuration found in global variables");
                    return false;
                }

                // Check if we need to reload (config might have changed)
                string currentSha = ComputeSha256(configJson);
                if (this.cachedConfig != null && this.cachedConfigSha == currentSha && IsConfigCacheValid())
                {
                    LogExecution(LogLevel.Info, "LoadMediaSpawnerConfig: Using cached configuration (SHA match)");
                    return true;
                }

                // Deserialize configuration
                if (!MediaSpawnerConfig.TryDeserialize(configJson, out MediaSpawnerConfig config, out string error))
                {
                    LogExecution(LogLevel.Error, $"LoadMediaSpawnerConfig: Failed to deserialize configuration: {error}");
                    return false;
                }

                // Cache the configuration with timestamp
                this.cachedConfig = config;
                this.cachedConfigSha = currentSha;
                this.configCacheTimestamp = DateTime.UtcNow;

                LogExecution(LogLevel.Info, $"LoadMediaSpawnerConfig: Successfully loaded configuration with {config.Profiles.Count} profiles and {config.Assets.Count} assets");
                return true;
            }
            catch (Exception ex)
            {
                LogExecution(LogLevel.Error, $"LoadMediaSpawnerConfig: Unexpected error: {ex.Message}");
                return false;
            }
        }
    }

    /// <summary>
    /// Get a spawn profile by ID
    /// </summary>
    /// <returns>True if profile found and set in global variable, false otherwise</returns>
    public bool GetSpawnProfile()
    {
        try
        {
            if (!CPH.TryGetArg("profileId", out string profileId) || string.IsNullOrWhiteSpace(profileId))
            {
                LogExecution(LogLevel.Error, "GetSpawnProfile: Missing required argument 'profileId'");
                return false;
            }

            if (this.cachedConfig == null)
            {
                LogExecution(LogLevel.Error, "GetSpawnProfile: No configuration loaded. Call LoadMediaSpawnerConfig first.");
                return false;
            }

            SpawnProfile profile = this.cachedConfig.FindProfileById(profileId);
            if (profile == null)
            {
                LogExecution(LogLevel.Error, $"GetSpawnProfile: Profile with ID '{profileId}' not found");
                return false;
            }

            // Set profile data in global variables for use by other actions
            CPH.SetGlobalVar("MediaSpawner_CurrentProfile", JsonConvert.SerializeObject(profile), persisted: false);
            CPH.SetGlobalVar("MediaSpawner_CurrentProfileId", profile.Id, persisted: false);
            CPH.SetGlobalVar("MediaSpawner_CurrentProfileName", profile.Name, persisted: false);

            LogExecution(LogLevel.Info, $"GetSpawnProfile: Successfully loaded profile '{profile.Name}' with {profile.Spawns.Count} spawns");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"GetSpawnProfile: Unexpected error: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Get an asset by ID
    /// </summary>
    /// <returns>True if asset found and set in global variable, false otherwise</returns>
    public bool GetAsset()
    {
        try
        {
            if (!CPH.TryGetArg("assetId", out string assetId) || string.IsNullOrWhiteSpace(assetId))
            {
                LogExecution(LogLevel.Error, "GetAsset: Missing required argument 'assetId'");
                return false;
            }

            if (this.cachedConfig == null)
            {
                LogExecution(LogLevel.Error, "GetAsset: No configuration loaded. Call LoadMediaSpawnerConfig first.");
                return false;
            }

            MediaAsset asset = this.cachedConfig.FindAssetById(assetId);
            if (asset == null)
            {
                LogExecution(LogLevel.Error, $"GetAsset: Asset with ID '{assetId}' not found");
                return false;
            }

            // Set asset data in global variables for use by other actions
            CPH.SetGlobalVar("MediaSpawner_CurrentAsset", JsonConvert.SerializeObject(asset), persisted: false);
            CPH.SetGlobalVar("MediaSpawner_CurrentAssetId", asset.Id, persisted: false);
            CPH.SetGlobalVar("MediaSpawner_CurrentAssetName", asset.Name, persisted: false);
            CPH.SetGlobalVar("MediaSpawner_CurrentAssetType", asset.Type, persisted: false);
            CPH.SetGlobalVar("MediaSpawner_CurrentAssetPath", asset.Path, persisted: false);

            LogExecution(LogLevel.Info, $"GetAsset: Successfully loaded asset '{asset.Name}' ({asset.Type})");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"GetAsset: Unexpected error: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Get all enabled spawns from the loaded configuration
    /// </summary>
    /// <returns>True if spawns found and set in global variable, false otherwise</returns>
    public bool GetEnabledSpawns()
    {
        try
        {
            if (this.cachedConfig == null)
            {
                LogExecution(LogLevel.Error, "GetEnabledSpawns: No configuration loaded. Call LoadMediaSpawnerConfig first.");
                return false;
            }

            List<Spawn> enabledSpawns = this.cachedConfig.GetEnabledSpawns();
            if (enabledSpawns.Count == 0)
            {
                LogExecution(LogLevel.Warning, "GetEnabledSpawns: No enabled spawns found in configuration");
                CPH.SetGlobalVar("MediaSpawner_EnabledSpawns", "[]", persisted: false);
                CPH.SetGlobalVar("MediaSpawner_EnabledSpawnsCount", "0", persisted: false);
                return true;
            }

            // Set spawns data in global variables
            CPH.SetGlobalVar("MediaSpawner_EnabledSpawns", JsonConvert.SerializeObject(enabledSpawns), persisted: false);
            CPH.SetGlobalVar("MediaSpawner_EnabledSpawnsCount", enabledSpawns.Count.ToString(), persisted: false);

            LogExecution(LogLevel.Info, $"GetEnabledSpawns: Found {enabledSpawns.Count} enabled spawns");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"GetEnabledSpawns: Unexpected error: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Validate the loaded MediaSpawner configuration
    /// </summary>
    /// <returns>True if configuration is valid, false otherwise</returns>
    public bool ValidateConfig()
    {
        try
        {
            if (this.cachedConfig == null)
            {
                LogExecution(LogLevel.Error, "ValidateConfig: No configuration loaded. Call LoadMediaSpawnerConfig first.");
                return false;
            }

            ValidationResult validationResult = this.cachedConfig.Validate();

            if (validationResult.IsValid)
            {
                LogExecution(LogLevel.Info, "ValidateConfig: Configuration is valid");
                if (validationResult.Warnings.Count > 0)
                {
                    LogExecution(LogLevel.Warning, $"ValidateConfig: {validationResult.Warnings.Count} warnings found: {string.Join(", ", validationResult.Warnings)}");
                }

                return true;
            }
            else
            {
                LogExecution(LogLevel.Error, $"ValidateConfig: Configuration validation failed with {validationResult.Errors.Count} errors: {string.Join(", ", validationResult.Errors)}");
                return false;
            }
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ValidateConfig: Unexpected error: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Get assets filtered by type
    /// </summary>
    /// <returns>True if assets found and set in global variable, false otherwise</returns>
    public bool GetAssetsByType()
    {
        try
        {
            if (!CPH.TryGetArg("assetType", out string assetType) || string.IsNullOrWhiteSpace(assetType))
            {
                LogExecution(LogLevel.Error, "GetAssetsByType: Missing required argument 'assetType'");
                return false;
            }

            if (this.cachedConfig == null)
            {
                LogExecution(LogLevel.Error, "GetAssetsByType: No configuration loaded. Call LoadMediaSpawnerConfig first.");
                return false;
            }

            List<MediaAsset> assets = this.cachedConfig.GetAssetsByType(assetType);

            // Set assets data in global variables
            CPH.SetGlobalVar("MediaSpawner_FilteredAssets", JsonConvert.SerializeObject(assets), persisted: false);
            CPH.SetGlobalVar("MediaSpawner_FilteredAssetsCount", assets.Count.ToString(), persisted: false);
            CPH.SetGlobalVar("MediaSpawner_FilteredAssetsType", assetType, persisted: false);

            LogExecution(LogLevel.Info, $"GetAssetsByType: Found {assets.Count} assets of type '{assetType}'");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"GetAssetsByType: Unexpected error: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Get a spawn by ID from a specific profile
    /// </summary>
    /// <returns>True if spawn found and set in global variable, false otherwise</returns>
    public bool GetSpawnById()
    {
        try
        {
            if (!CPH.TryGetArg("profileId", out string profileId) || string.IsNullOrWhiteSpace(profileId))
            {
                LogExecution(LogLevel.Error, "GetSpawnById: Missing required argument 'profileId'");
                return false;
            }

            if (!CPH.TryGetArg("spawnId", out string spawnId) || string.IsNullOrWhiteSpace(spawnId))
            {
                LogExecution(LogLevel.Error, "GetSpawnById: Missing required argument 'spawnId'");
                return false;
            }

            if (this.cachedConfig == null)
            {
                LogExecution(LogLevel.Error, "GetSpawnById: No configuration loaded. Call LoadMediaSpawnerConfig first.");
                return false;
            }

            SpawnProfile profile = this.cachedConfig.FindProfileById(profileId);
            if (profile == null)
            {
                LogExecution(LogLevel.Error, $"GetSpawnById: Profile with ID '{profileId}' not found");
                return false;
            }

            Spawn spawn = profile.FindSpawnById(spawnId);
            if (spawn == null)
            {
                LogExecution(LogLevel.Error, $"GetSpawnById: Spawn with ID '{spawnId}' not found in profile '{profile.Name}'");
                return false;
            }

            // Set spawn data in global variables
            CPH.SetGlobalVar("MediaSpawner_CurrentSpawn", JsonConvert.SerializeObject(spawn), persisted: false);
            CPH.SetGlobalVar("MediaSpawner_CurrentSpawnId", spawn.Id, persisted: false);
            CPH.SetGlobalVar("MediaSpawner_CurrentSpawnName", spawn.Name, persisted: false);
            CPH.SetGlobalVar("MediaSpawner_CurrentSpawnEnabled", spawn.Enabled.ToString(), persisted: false);

            LogExecution(LogLevel.Info, $"GetSpawnById: Successfully loaded spawn '{spawn.Name}' from profile '{profile.Name}'");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"GetSpawnById: Unexpected error: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Clear cached configuration (useful for testing or when config changes)
    /// </summary>
    /// <returns>True if cache cleared successfully</returns>
    public bool ClearConfigCache()
    {
        try
        {
            this.cachedConfig = null;
            this.cachedConfigSha = null;
            LogExecution(LogLevel.Info, "ClearConfigCache: Configuration cache cleared");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ClearConfigCache: Unexpected error: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Get and log comprehensive timer status information
    /// </summary>
    /// <returns>True if timer status retrieved and logged successfully</returns>
    public bool GetTimerStatusInfo()
    {
        try
        {
            Dictionary<string, object> status = GetTimerStatus();

            LogExecution(LogLevel.Info, "GetTimerStatusInfo: === Timer Status Report ===");
            LogExecution(LogLevel.Info, $"GetTimerStatusInfo: Active Timer Count: {status["activeTimerCount"]}");
            LogExecution(LogLevel.Info, $"GetTimerStatusInfo: Timers Initialized: {status["timersInitialized"]}");
            LogExecution(LogLevel.Info, $"GetTimerStatusInfo: Timers Paused: {status["timersPaused"]}");
            LogExecution(LogLevel.Info, $"GetTimerStatusInfo: Is Shutting Down: {status["isShuttingDown"]}");
            LogExecution(LogLevel.Info, $"GetTimerStatusInfo: Timestamp: {status["timestamp"]}");

            if (status.ContainsKey("activeTimerIds") && status["activeTimerIds"] is List<string> timerIds)
            {
                LogExecution(LogLevel.Info, $"GetTimerStatusInfo: Active Timer IDs: [{string.Join(", ", timerIds)}]");
            }

            if (status.ContainsKey("timerTypeBreakdown") && status["timerTypeBreakdown"] is Dictionary<string, int> timerTypes)
            {
                LogExecution(LogLevel.Info, "GetTimerStatusInfo: Timer Type Breakdown:");
                foreach (KeyValuePair<string, int> kvp in timerTypes)
                {
                    LogExecution(LogLevel.Info, $"GetTimerStatusInfo:   {kvp.Key}: {kvp.Value}");
                }
            }

            if (status.ContainsKey("pausedTimerCount"))
            {
                LogExecution(LogLevel.Info, $"GetTimerStatusInfo: Paused Timer Count: {status["pausedTimerCount"]}");
            }

            if (status.ContainsKey("activeTimerCount"))
            {
                LogExecution(LogLevel.Info, $"GetTimerStatusInfo: Active Timer Count: {status["activeTimerCount"]}");
            }

            if (status.ContainsKey("timerStates") && status["timerStates"] is Dictionary<string, bool> timerStates)
            {
                LogExecution(LogLevel.Info, "GetTimerStatusInfo: Individual Timer States:");
                foreach (KeyValuePair<string, bool> kvp in timerStates)
                {
                    string state = kvp.Value ? "Paused" : "Active";
                    LogExecution(LogLevel.Info, $"GetTimerStatusInfo:   {kvp.Key}: {state}");
                }
            }

            if (status.ContainsKey("performanceStats") && status["performanceStats"] is Dictionary<string, object> perfStats)
            {
                LogExecution(LogLevel.Info, "GetTimerStatusInfo: Performance Statistics:");
                foreach (KeyValuePair<string, object> kvp in perfStats)
                {
                    LogExecution(LogLevel.Info, $"GetTimerStatusInfo:   {kvp.Key}: {kvp.Value}");
                }
            }

            if (status.ContainsKey("error"))
            {
                LogExecution(LogLevel.Error, $"GetTimerStatusInfo: Error in timer status: {status["error"]}");
                return false;
            }

            LogExecution(LogLevel.Info, "GetTimerStatusInfo: === End Timer Status Report ===");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"GetTimerStatusInfo: Unexpected error: {ex.Message}");
            return false;
        }
    }

    #region MediaSpawnerConfig classes

    /// <summary>
    /// Root configuration structure for MediaSpawner data
    /// </summary>
    public class MediaSpawnerConfig
    {
        [JsonProperty("version")]
        public string Version { get; set; } = string.Empty;

        [JsonProperty("profiles")]
        public List<SpawnProfile> Profiles { get; set; } = new List<SpawnProfile>();

        [JsonProperty("assets")]
        public List<MediaAsset> Assets { get; set; } = new List<MediaAsset>();

        /// <summary>
        /// Deserialize MediaSpawnerConfig from JSON string
        /// </summary>
        /// <param name="json">JSON string to deserialize</param>
        /// <returns>Deserialized MediaSpawnerConfig object</returns>
        /// <exception cref="ArgumentException">Thrown when JSON string is null or empty</exception>
        /// <exception cref="InvalidOperationException">Thrown when deserialization fails</exception>
        public static MediaSpawnerConfig FromJson(string json)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(json))
                {
                    throw new ArgumentException("JSON string cannot be null or empty", nameof(json));
                }

                MediaSpawnerConfig result = JsonConvert.DeserializeObject<MediaSpawnerConfig>(json);
                if (result == null)
                {
                    throw new InvalidOperationException("Failed to deserialize MediaSpawnerConfig - result is null");
                }

                return result;
            }
            catch (JsonException ex)
            {
                throw new InvalidOperationException($"JSON deserialization failed: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Try to deserialize MediaSpawnerConfig from JSON string
        /// </summary>
        /// <param name="json">JSON string to deserialize</param>
        /// <param name="config">Output parameter for the deserialized config</param>
        /// <param name="error">Output parameter for error message if deserialization fails</param>
        /// <returns>True if deserialization succeeded, false otherwise</returns>
        public static bool TryDeserialize(string json, out MediaSpawnerConfig config, out string error)
        {
            config = null;
            error = string.Empty;

            try
            {
                if (string.IsNullOrWhiteSpace(json))
                {
                    error = "JSON string cannot be null or empty";
                    return false;
                }

                config = JsonConvert.DeserializeObject<MediaSpawnerConfig>(json);
                if (config == null)
                {
                    error = "Failed to deserialize MediaSpawnerConfig - result is null";
                    return false;
                }

                return true;
            }
            catch (JsonException ex)
            {
                error = $"JSON deserialization failed: {ex.Message}";
                return false;
            }
            catch (Exception ex)
            {
                error = $"Unexpected error during deserialization: {ex.Message}";
                return false;
            }
        }

        /// <summary>
        /// Validate the MediaSpawnerConfig data integrity
        /// </summary>
        /// <returns>Validation result with errors and warnings</returns>
        public ValidationResult Validate()
        {
            ValidationResult result = new ValidationResult();

            if (string.IsNullOrWhiteSpace(Version))
            {
                result.AddError("Version is required");
            }

            if (Profiles == null)
            {
                result.AddError("Profiles list cannot be null");
            }
            else
            {
                for (int i = 0; i < Profiles.Count; i++)
                {
                    ValidationResult profileResult = Profiles[i].Validate();
                    if (!profileResult.IsValid)
                    {
                        result.AddError($"Profile {i}: {string.Join(", ", profileResult.Errors)}");
                    }

                    result.AddWarnings(profileResult.Warnings);
                }
            }

            if (Assets == null)
            {
                result.AddError("Assets list cannot be null");
            }
            else
            {
                for (int i = 0; i < Assets.Count; i++)
                {
                    ValidationResult assetResult = Assets[i].Validate();
                    if (!assetResult.IsValid)
                    {
                        result.AddError($"Asset {i}: {string.Join(", ", assetResult.Errors)}");
                    }

                    result.AddWarnings(assetResult.Warnings);
                }
            }

            return result;
        }

        /// <summary>
        /// Find an asset by its ID
        /// </summary>
        /// <param name="assetId">The asset ID to search for</param>
        /// <returns>The asset if found, null otherwise</returns>
        public MediaAsset FindAssetById(string assetId)
        {
            if (string.IsNullOrWhiteSpace(assetId) || Assets == null)
                return null;

            return Assets.FirstOrDefault(a => a.Id == assetId);
        }

        /// <summary>
        /// Get all assets of a specific type
        /// </summary>
        /// <param name="type">The asset type to filter by</param>
        /// <returns>List of assets matching the type</returns>
        public List<MediaAsset> GetAssetsByType(string type)
        {
            if (string.IsNullOrWhiteSpace(type) || Assets == null)
                return new List<MediaAsset>();

            return Assets.Where(a => a.Type.Equals(type, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        /// <summary>
        /// Get all enabled spawns from all profiles
        /// </summary>
        /// <returns>List of all enabled spawns</returns>
        public List<Spawn> GetEnabledSpawns()
        {
            List<Spawn> enabledSpawns = new List<Spawn>();

            if (Profiles != null)
            {
                foreach (SpawnProfile profile in Profiles)
                {
                    enabledSpawns.AddRange(profile.GetEnabledSpawns());
                }
            }

            return enabledSpawns;
        }

        /// <summary>
        /// Get a profile by its ID
        /// </summary>
        /// <param name="profileId">The profile ID to search for</param>
        /// <returns>The profile if found, null otherwise</returns>
        public SpawnProfile FindProfileById(string profileId)
        {
            if (string.IsNullOrWhiteSpace(profileId) || Profiles == null)
                return null;

            return Profiles.FirstOrDefault(p => p.Id == profileId);
        }
    }

    /// <summary>
    /// Spawn profile containing multiple spawns and working directory
    /// </summary>
    public class SpawnProfile
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("description")]
        public string Description { get; set; }

        [JsonProperty("workingDirectory")]
        public string WorkingDirectory { get; set; } = string.Empty;

        [JsonProperty("spawns")]
        public List<Spawn> Spawns { get; set; } = new List<Spawn>();

        [JsonProperty("lastModified")]
        public string LastModified { get; set; } = string.Empty;

        /// <summary>
        /// Validate the SpawnProfile data integrity
        /// </summary>
        /// <returns>Validation result with errors and warnings</returns>
        public ValidationResult Validate()
        {
            ValidationResult result = new ValidationResult();

            if (string.IsNullOrWhiteSpace(Id))
            {
                result.AddError("Profile ID is required");
            }

            if (string.IsNullOrWhiteSpace(Name))
            {
                result.AddError("Profile name is required");
            }

            if (Spawns == null)
            {
                result.AddError("Spawns list cannot be null");
            }
            else
            {
                for (int i = 0; i < Spawns.Count; i++)
                {
                    ValidationResult spawnResult = Spawns[i].Validate();
                    if (!spawnResult.IsValid)
                    {
                        result.AddError($"Spawn {i}: {string.Join(", ", spawnResult.Errors)}");
                    }

                    result.AddWarnings(spawnResult.Warnings);
                }
            }

            return result;
        }

        /// <summary>
        /// Get all enabled spawns in this profile
        /// </summary>
        /// <returns>List of enabled spawns</returns>
        public List<Spawn> GetEnabledSpawns()
        {
            if (Spawns == null)
                return new List<Spawn>();

            return Spawns.Where(s => s.Enabled).ToList();
        }

        /// <summary>
        /// Find a spawn by its ID
        /// </summary>
        /// <param name="spawnId">The spawn ID to search for</param>
        /// <returns>The spawn if found, null otherwise</returns>
        public Spawn FindSpawnById(string spawnId)
        {
            if (string.IsNullOrWhiteSpace(spawnId) || Spawns == null)
                return null;

            return Spawns.FirstOrDefault(s => s.Id == spawnId);
        }
    }

    /// <summary>
    /// Individual spawn configuration with trigger and assets
    /// </summary>
    public class Spawn
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("description")]
        public string Description { get; set; }

        [JsonProperty("enabled")]
        public bool Enabled { get; set; }

        [JsonProperty("trigger")]
        public Trigger Trigger { get; set; } = new Trigger();

        [JsonProperty("duration")]
        public double Duration { get; set; }

        [JsonProperty("assets")]
        public List<SpawnAsset> Assets { get; set; } = new List<SpawnAsset>();

        [JsonProperty("randomizationBuckets")]
        public List<RandomizationBucket> RandomizationBuckets { get; set; } = new List<RandomizationBucket>();

        [JsonProperty("defaultProperties")]
        public AssetSettings DefaultProperties { get; set; } = new AssetSettings();

        /// <summary>
        /// Validate the Spawn data integrity
        /// </summary>
        /// <returns>Validation result with errors and warnings</returns>
        public ValidationResult Validate()
        {
            ValidationResult result = new ValidationResult();

            if (string.IsNullOrWhiteSpace(Id))
            {
                result.AddError("Spawn ID is required");
            }

            if (string.IsNullOrWhiteSpace(Name))
            {
                result.AddError("Spawn name is required");
            }

            if (Duration < 0)
            {
                result.AddError("Duration must be non-negative");
            }

            if (Trigger == null)
            {
                result.AddError("Trigger cannot be null");
            }
            else
            {
                ValidationResult triggerResult = Trigger.Validate();
                if (!triggerResult.IsValid)
                {
                    result.AddError($"Trigger: {string.Join(", ", triggerResult.Errors)}");
                }

                result.AddWarnings(triggerResult.Warnings);
            }

            if (Assets == null)
            {
                result.AddError("Assets list cannot be null");
            }
            else
            {
                for (int i = 0; i < Assets.Count; i++)
                {
                    ValidationResult assetResult = Assets[i].Validate();
                    if (!assetResult.IsValid)
                    {
                        result.AddError($"Asset {i}: {string.Join(", ", assetResult.Errors)}");
                    }

                    result.AddWarnings(assetResult.Warnings);
                }
            }

            if (RandomizationBuckets != null)
            {
                for (int i = 0; i < RandomizationBuckets.Count; i++)
                {
                    ValidationResult bucketResult = RandomizationBuckets[i].Validate();
                    if (!bucketResult.IsValid)
                    {
                        result.AddError($"RandomizationBucket {i}: {string.Join(", ", bucketResult.Errors)}");
                    }

                    result.AddWarnings(bucketResult.Warnings);
                }
            }

            return result;
        }

        /// <summary>
        /// Get all enabled assets in this spawn
        /// </summary>
        /// <returns>List of enabled assets</returns>
        public List<SpawnAsset> GetEnabledAssets()
        {
            if (Assets == null)
                return new List<SpawnAsset>();

            return Assets.Where(a => a.Enabled).OrderBy(a => a.Order).ToList();
        }

        /// <summary>
        /// Find an asset by its ID in this spawn
        /// </summary>
        /// <param name="assetId">The asset ID to search for</param>
        /// <returns>The spawn asset if found, null otherwise</returns>
        public SpawnAsset FindAssetById(string assetId)
        {
            if (string.IsNullOrWhiteSpace(assetId) || Assets == null)
                return null;

            return Assets.FirstOrDefault(a => a.AssetId == assetId);
        }

        /// <summary>
        /// Get all randomization bucket members
        /// </summary>
        /// <returns>List of all bucket members across all buckets</returns>
        public List<RandomizationBucketMember> GetRandomizationBucketMembers()
        {
            List<RandomizationBucketMember> members = new List<RandomizationBucketMember>();

            if (RandomizationBuckets != null)
            {
                foreach (RandomizationBucket bucket in RandomizationBuckets)
                {
                    if (bucket.Members != null)
                    {
                        members.AddRange(bucket.Members);
                    }
                }
            }

            return members;
        }
    }

    /// <summary>
    /// Asset assignment within a spawn with optional overrides
    /// </summary>
    public class SpawnAsset
    {
        [JsonProperty("assetId")]
        public string AssetId { get; set; } = string.Empty;

        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("enabled")]
        public bool Enabled { get; set; }

        [JsonProperty("order")]
        public int Order { get; set; }

        [JsonProperty("overrides")]
        public SpawnAssetOverrides Overrides { get; set; } = new SpawnAssetOverrides();

        /// <summary>
        /// Validate the SpawnAsset data integrity
        /// </summary>
        /// <returns>Validation result with errors and warnings</returns>
        public ValidationResult Validate()
        {
            ValidationResult result = new ValidationResult();

            if (string.IsNullOrWhiteSpace(Id))
            {
                result.AddError("SpawnAsset ID is required");
            }

            if (string.IsNullOrWhiteSpace(AssetId))
            {
                result.AddError("Asset ID is required");
            }

            if (Order < 0)
            {
                result.AddError("Order must be non-negative");
            }

            if (Overrides != null)
            {
                if (Overrides.Duration.HasValue && Overrides.Duration.Value < 0)
                {
                    result.AddError("Override duration must be non-negative");
                }
            }

            return result;
        }
    }

    /// <summary>
    /// Override settings for a spawn asset
    /// </summary>
    public class SpawnAssetOverrides
    {
        [JsonProperty("duration")]
        public double? Duration { get; set; }

        [JsonProperty("properties")]
        public AssetSettings Properties { get; set; } = new AssetSettings();
    }

    /// <summary>
    /// Media asset definition (image, video, or audio)
    /// </summary>
    public class MediaAsset
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("path")]
        public string Path { get; set; } = string.Empty;

        [JsonProperty("isUrl")]
        public bool IsUrl { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; } = string.Empty;

        /// <summary>
        /// Validate the MediaAsset data integrity
        /// </summary>
        /// <returns>Validation result with errors and warnings</returns>
        public ValidationResult Validate()
        {
            ValidationResult result = new ValidationResult();

            if (string.IsNullOrWhiteSpace(Id))
            {
                result.AddError("Asset ID is required");
            }

            if (string.IsNullOrWhiteSpace(Name))
            {
                result.AddError("Asset name is required");
            }

            if (string.IsNullOrWhiteSpace(Path))
            {
                result.AddError("Asset path is required");
            }

            if (string.IsNullOrWhiteSpace(Type))
            {
                result.AddError("Asset type is required");
            }
            else if (!IsValidAssetType(Type))
            {
                result.AddError($"Invalid asset type: {Type}. Must be 'image', 'video', or 'audio'");
            }

            return result;
        }

        /// <summary>
        /// Check if the asset type is valid
        /// </summary>
        /// <param name="type">The type to validate</param>
        /// <returns>True if valid, false otherwise</returns>
        private static bool IsValidAssetType(string type)
        {
            if (string.IsNullOrWhiteSpace(type))
                return false;

            string[] validTypes = new[] { "image", "video", "audio" };
            return validTypes.Contains(type.ToLowerInvariant());
        }

        /// <summary>
        /// Check if this asset is of a specific type
        /// </summary>
        /// <param name="type">The type to check</param>
        /// <returns>True if the asset is of the specified type</returns>
        private bool IsType(string type)
        {
            if (string.IsNullOrWhiteSpace(type) || string.IsNullOrWhiteSpace(Type))
                return false;

            return Type.Equals(type, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Check if this asset is an image
        /// </summary>
        /// <returns>True if the asset is an image</returns>
        public bool IsImage()
        {
            return IsType("image");
        }

        /// <summary>
        /// Check if this asset is a video
        /// </summary>
        /// <returns>True if the asset is a video</returns>
        public bool IsVideo()
        {
            return IsType("video");
        }

        /// <summary>
        /// Check if this asset is audio
        /// </summary>
        /// <returns>True if the asset is audio</returns>
        public bool IsAudio()
        {
            return IsType("audio");
        }

        public override string ToString()
        {
            return $"{Name} ({Type}) - {Path}";
        }
    }

    /// <summary>
    /// Trigger configuration for spawn activation
    /// </summary>
    public class Trigger
    {
        [JsonProperty("type")]
        public string Type { get; set; } = string.Empty;

        [JsonProperty("enabled")]
        public bool Enabled { get; set; }

        [JsonProperty("config")]
        public Dictionary<string, object> Config { get; set; } = new Dictionary<string, object>();

        /// <summary>
        /// Validate the Trigger data integrity
        /// </summary>
        /// <returns>Validation result with errors and warnings</returns>
        public ValidationResult Validate()
        {
            ValidationResult result = new ValidationResult();

            if (string.IsNullOrWhiteSpace(Type))
            {
                result.AddError("Trigger type is required");
            }

            if (Config == null)
            {
                result.AddError("Trigger config cannot be null");
            }

            return result;
        }
    }

    /// <summary>
    /// Randomization bucket for asset selection
    /// </summary>
    public class RandomizationBucket
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("selection")]
        public string Selection { get; set; } = string.Empty;

        [JsonProperty("n")]
        public int? N { get; set; }

        [JsonProperty("weighted")]
        public bool? Weighted { get; set; }

        [JsonProperty("noImmediateRepeat")]
        public bool? NoImmediateRepeat { get; set; }

        [JsonProperty("members")]
        public List<RandomizationBucketMember> Members { get; set; } = new List<RandomizationBucketMember>();

        /// <summary>
        /// Validate the RandomizationBucket data integrity
        /// </summary>
        /// <returns>Validation result with errors and warnings</returns>
        public ValidationResult Validate()
        {
            ValidationResult result = new ValidationResult();

            if (string.IsNullOrWhiteSpace(Id))
            {
                result.AddError("Bucket ID is required");
            }

            if (string.IsNullOrWhiteSpace(Name))
            {
                result.AddError("Bucket name is required");
            }

            if (string.IsNullOrWhiteSpace(Selection))
            {
                result.AddError("Selection type is required");
            }
            else if (!IsValidSelectionType(Selection))
            {
                result.AddError($"Invalid selection type: {Selection}. Must be 'one' or 'n'");
            }

            if (Selection == "n" && (!N.HasValue || N.Value <= 0))
            {
                result.AddError("When selection is 'n', the n value must be specified and greater than 0");
            }

            if (Members == null)
            {
                result.AddError("Members list cannot be null");
            }
            else if (Members.Count == 0)
            {
                result.AddWarning("Bucket has no members");
            }

            return result;
        }

        /// <summary>
        /// Check if the selection type is valid
        /// </summary>
        /// <param name="selection">The selection type to validate</param>
        /// <returns>True if valid, false otherwise</returns>
        private static bool IsValidSelectionType(string selection)
        {
            if (string.IsNullOrWhiteSpace(selection))
                return false;

            string[] validTypes = new[] { "one", "n" };
            return validTypes.Contains(selection.ToLowerInvariant());
        }
    }

    /// <summary>
    /// Member of a randomization bucket
    /// </summary>
    public class RandomizationBucketMember
    {
        [JsonProperty("spawnAssetId")]
        public string SpawnAssetId { get; set; } = string.Empty;

        [JsonProperty("weight")]
        public double? Weight { get; set; }
    }

    /// <summary>
    /// Asset settings for display and playback properties
    /// </summary>
    public class AssetSettings
    {
        [JsonProperty("volume")]
        public double? Volume { get; set; }

        [JsonProperty("width")]
        public double? Width { get; set; }

        [JsonProperty("height")]
        public double? Height { get; set; }

        [JsonProperty("scale")]
        public double? Scale { get; set; }

        [JsonProperty("positionMode")]
        public string PositionMode { get; set; } = string.Empty;

        [JsonProperty("x")]
        public double? X { get; set; }

        [JsonProperty("y")]
        public double? Y { get; set; }

        [JsonProperty("loop")]
        public bool? Loop { get; set; }

        [JsonProperty("autoplay")]
        public bool? Autoplay { get; set; }

        [JsonProperty("muted")]
        public bool? Muted { get; set; }

        [JsonProperty("rotation")]
        public double? Rotation { get; set; }

        [JsonProperty("cropLeft")]
        public double? CropLeft { get; set; }

        [JsonProperty("cropTop")]
        public double? CropTop { get; set; }

        [JsonProperty("cropRight")]
        public double? CropRight { get; set; }

        [JsonProperty("cropBottom")]
        public double? CropBottom { get; set; }

        [JsonProperty("alignment")]
        public int? Alignment { get; set; }

        [JsonProperty("boundsType")]
        public string BoundsType { get; set; }

        [JsonProperty("boundsAlignment")]
        public int? BoundsAlignment { get; set; }
    }

    /// <summary>
    /// Validation result containing errors and warnings
    /// </summary>
    public class ValidationResult
    {
        public List<string> Errors { get; set; } = new List<string>();
        public List<string> Warnings { get; set; } = new List<string>();

        public bool IsValid => Errors.Count == 0;

        public void AddError(string error)
        {
            if (!string.IsNullOrWhiteSpace(error))
                Errors.Add(error);
        }

        public void AddWarning(string warning)
        {
            if (!string.IsNullOrWhiteSpace(warning))
                Warnings.Add(warning);
        }

        public void AddWarnings(IEnumerable<string> warnings)
        {
            if (warnings != null)
            {
                foreach (string warning in warnings)
                {
                    AddWarning(warning);
                }
            }
        }

        public override string ToString()
        {
            List<string> result = new List<string>();
            if (Errors.Count > 0)
                result.Add($"Errors: {string.Join(", ", Errors)}");
            if (Warnings.Count > 0)
                result.Add($"Warnings: {string.Join(", ", Warnings)}");
            return string.Join("; ", result);
        }
    }

    #endregion

    #region Trigger-Specific Helper Methods

    /// <summary>
    /// Validate spawn ID format
    /// </summary>
    /// <param name="spawnId">The spawn ID to validate</param>
    /// <returns>True if valid, false otherwise</returns>
    private bool IsValidSpawnId(string spawnId)
    {
        if (string.IsNullOrWhiteSpace(spawnId))
            return false;

        // Basic GUID format validation
        return Guid.TryParse(spawnId, out _);
    }

    /// <summary>
    /// Validate spawn for execution
    /// </summary>
    /// <param name="spawn">The spawn to validate</param>
    /// <param name="triggerType">The trigger type being used</param>
    /// <returns>Validation result</returns>
    private ValidationResult ValidateSpawnForExecution(Spawn spawn, string triggerType)
    {
        ValidationResult result = new ValidationResult();

        if (spawn == null)
        {
            result.AddError("Spawn is null");
            return result;
        }

        if (!spawn.Enabled)
        {
            result.AddError("Spawn is disabled");
            return result;
        }

        if (spawn.Trigger?.Type != triggerType)
        {
            result.AddError($"Spawn trigger type '{spawn.Trigger?.Type}' does not match expected '{triggerType}'");
            return result;
        }

        if (spawn.Assets == null || spawn.Assets.Count == 0)
        {
            result.AddError("Spawn has no assets");
        }

        return result;
    }

    /// <summary>
    /// Check if spawn has any enabled assets
    /// </summary>
    /// <param name="spawn">The spawn to check</param>
    /// <returns>True if has enabled assets, false otherwise</returns>
    private bool HasEnabledAssets(Spawn spawn)
    {
        if (spawn?.Assets == null)
            return false;

        return spawn.Assets.Any(asset => asset.Enabled);
    }


    /// <summary>
    /// Validate Twitch event conditions for a spawn
    /// </summary>
    /// <param name="spawn">The spawn to validate</param>
    /// <param name="eventType">The Twitch event type</param>
    /// <param name="eventData">The event data</param>
    /// <returns>True if conditions are met, false otherwise</returns>
    private bool ValidateTwitchEventConditions(Spawn spawn, string eventType, Dictionary<string, object> eventData)
    {
        if (spawn?.Trigger?.Config == null)
            return true; // No specific conditions to validate

        Dictionary<string, object> config = spawn.Trigger.Config;

        switch (eventType)
        {
            case "cheer":
                return ValidateCheerConditions(config, eventData);
            case "subscription":
                return ValidateSubscriptionConditions(config, eventData);
            case "giftSub":
                return ValidateGiftSubConditions(config, eventData);
            case "channelPointReward":
                return ValidateChannelPointRewardConditions(config, eventData);
            default:
                return true; // No specific validation for other event types
        }
    }

    /// <summary>
    /// Validate cheer event conditions
    /// </summary>
    private bool ValidateCheerConditions(Dictionary<string, object> config, Dictionary<string, object> eventData)
    {
        if (config.ContainsKey("bits") && config["bits"] is int minBits)
        {
            int bits = eventData.ContainsKey("bits") && eventData["bits"] is int b ? b : 0;
            if (bits < minBits)
                return false;
        }

        if (config.ContainsKey("bitsComparator") && config["bitsComparator"] is string comparator)
        {
            int bits = eventData.ContainsKey("bits") && eventData["bits"] is int b ? b : 0;
            int threshold = config.ContainsKey("bits") && config["bits"] is int t ? t : 0;

            switch (comparator)
            {
                case "lt":
                    return bits < threshold;
                case "eq":
                    return bits == threshold;
                case "gt":
                    return bits > threshold;
                default:
                    return true;
            }
        }

        return true;
    }

    /// <summary>
    /// Validate subscription event conditions
    /// </summary>
    private bool ValidateSubscriptionConditions(Dictionary<string, object> config, Dictionary<string, object> eventData)
    {
        if (config.ContainsKey("tier") && config["tier"] is string configTier)
        {
            string eventTier = eventData.ContainsKey("tier") && eventData["tier"] is string t ? t : "1000";
            if (eventTier != configTier)
                return false;
        }

        if (config.ContainsKey("months") && config["months"] is int minMonths)
        {
            int months = eventData.ContainsKey("months") && eventData["months"] is int m ? m : 1;
            if (months < minMonths)
                return false;
        }

        if (config.ContainsKey("monthsComparator") && config["monthsComparator"] is string comparator)
        {
            int months = eventData.ContainsKey("months") && eventData["months"] is int m ? m : 1;
            int threshold = config.ContainsKey("months") && config["months"] is int t ? t : 1;

            switch (comparator)
            {
                case "lt":
                    return months < threshold;
                case "eq":
                    return months == threshold;
                case "gt":
                    return months > threshold;
                default:
                    return true;
            }
        }

        return true;
    }

    /// <summary>
    /// Validate gift subscription event conditions
    /// </summary>
    private bool ValidateGiftSubConditions(Dictionary<string, object> config, Dictionary<string, object> eventData)
    {
        if (config.ContainsKey("minCount") && config["minCount"] is int minCount)
        {
            int count = eventData.ContainsKey("count") && eventData["count"] is int c ? c : 1;
            if (count < minCount)
                return false;
        }

        if (config.ContainsKey("tier") && config["tier"] is string configTier)
        {
            string eventTier = eventData.ContainsKey("tier") && eventData["tier"] is string t ? t : "1000";
            if (eventTier != configTier)
                return false;
        }

        return true;
    }

    /// <summary>
    /// Validate channel point reward event conditions
    /// </summary>
    private bool ValidateChannelPointRewardConditions(Dictionary<string, object> config, Dictionary<string, object> eventData)
    {
        if (config.ContainsKey("rewardIdentifier") && config["rewardIdentifier"] is string rewardId)
        {
            string eventRewardId = eventData.ContainsKey("rewardId") && eventData["rewardId"] is string r ? r : "";
            if (eventRewardId != rewardId)
                return false;
        }

        if (config.ContainsKey("statuses") && config["statuses"] is List<object> statuses)
        {
            string eventStatus = eventData.ContainsKey("status") && eventData["status"] is string s ? s : "fulfilled";
            if (!statuses.Any(status => status is string statusStr && statusStr == eventStatus))
                return false;
        }

        return true;
    }

    #endregion

    #region State Management Methods

    /// <summary>
    /// Check if the configuration cache is still valid
    /// </summary>
    /// <returns>True if cache is valid, false otherwise</returns>
    private bool IsConfigCacheValid()
    {
        if (this.cachedConfig == null || this.configCacheTimestamp == DateTime.MinValue)
            return false;

        return DateTime.UtcNow.Subtract(this.configCacheTimestamp).TotalMinutes < ConfigCacheTtlMinutes;
    }

    /// <summary>
    /// Invalidate the configuration cache
    /// </summary>
    private void InvalidateConfigCache()
    {
        lock (this.lockObject)
        {
            this.cachedConfig = null;
            this.cachedConfigSha = null;
            this.configCacheTimestamp = DateTime.MinValue;
            LogExecution(LogLevel.Info, "StateManagement: Configuration cache invalidated");
        }
    }

    /// <summary>
    /// Start tracking an active spawn execution
    /// </summary>
    /// <param name="spawn">The spawn being executed</param>
    /// <param name="triggerType">The trigger type</param>
    /// <param name="context">Execution context</param>
    /// <returns>Execution ID for tracking</returns>
    private string StartSpawnExecution(Spawn spawn, string triggerType, Dictionary<string, object> context)
    {
        lock (this.lockObject)
        {
            string executionId = Guid.NewGuid().ToString();
            ActiveSpawnExecution activeExecution = new ActiveSpawnExecution
            {
                SpawnId = spawn.Id,
                SpawnName = spawn.Name,
                TriggerType = triggerType,
                StartTime = DateTime.UtcNow,
                ExpectedEndTime = DateTime.UtcNow.AddMilliseconds(spawn.Duration),
                Status = "Running",
                ExecutionId = executionId,
                Context = new Dictionary<string, object>(context),
                SourceGuids = new Dictionary<string, string>(),
                SourceSceneItemIds = new Dictionary<string, int>(),
            };

            this.activeSpawns[executionId] = activeExecution;

            // Add to execution history
            ExecutionRecord executionRecord = new ExecutionRecord
            {
                ExecutionId = executionId,
                SpawnId = spawn.Id,
                SpawnName = spawn.Name,
                TriggerType = triggerType,
                StartTime = DateTime.UtcNow,
                Status = "Running",
                Context = new Dictionary<string, object>(context),
            };

            AddExecutionRecord(executionRecord);

            LogExecution(LogLevel.Info, $"StateManagement: Started tracking execution {executionId} for spawn '{spawn.Name}'");
            return executionId;
        }
    }

    /// <summary>
    /// Complete tracking of an active spawn execution
    /// </summary>
    /// <param name="executionId">The execution ID</param>
    /// <param name="status">Final status (Success, Failed, Cancelled)</param>
    /// <param name="errorMessage">Error message if failed</param>
    private void CompleteSpawnExecution(string executionId, string status, string errorMessage = "")
    {
        lock (this.lockObject)
        {
            if (this.activeSpawns.TryGetValue(executionId, out ActiveSpawnExecution activeExecution))
            {
                activeExecution.Status = status;
                this.activeSpawns.Remove(executionId);

                // Update execution history
                ExecutionRecord executionRecord = this.executionHistory.FirstOrDefault(r => r.ExecutionId == executionId);
                if (executionRecord != null)
                {
                    executionRecord.EndTime = DateTime.UtcNow;
                    executionRecord.Status = status;
                    executionRecord.ErrorMessage = errorMessage;
                }


                LogExecution(LogLevel.Info, $"StateManagement: Completed execution {executionId} with status '{status}'");
            }
        }
    }

    /// <summary>
    /// Add an execution record to history
    /// </summary>
    /// <param name="record">The execution record</param>
    private void AddExecutionRecord(ExecutionRecord record)
    {
        lock (this.lockObject)
        {
            this.executionHistory.Add(record);

            // Maintain history size limit
            while (this.executionHistory.Count > MaxExecutionHistory)
            {
                this.executionHistory.RemoveAt(0);
            }
        }
    }

    /// <summary>
    /// Track randomization bucket selection
    /// </summary>
    /// <param name="bucketId">The bucket ID</param>
    /// <param name="selectedMembers">The selected members</param>
    private void TrackRandomizationSelection(string bucketId, List<string> selectedMembers)
    {
        lock (this.lockObject)
        {
            if (!this.randomizationHistory.TryGetValue(bucketId, out RandomizationHistory history))
            {
                history = new RandomizationHistory
                {
                    BucketId = bucketId,
                    MaxPatternLength = 10,
                };
                this.randomizationHistory[bucketId] = history;
            }

            history.LastSelectedMembers = new List<string>(selectedMembers);
            history.SelectionCount++;
            history.LastSelectionTime = DateTime.UtcNow;

            // Update selection pattern
            history.SelectionPattern.AddRange(selectedMembers);
            while (history.SelectionPattern.Count > history.MaxPatternLength)
            {
                history.SelectionPattern.RemoveAt(0);
            }

            LogExecution(LogLevel.Info, $"StateManagement: Tracked randomization selection for bucket '{bucketId}'");
        }
    }

    /// <summary>
    /// Get randomization history for a bucket
    /// </summary>
    /// <param name="bucketId">The bucket ID</param>
    /// <returns>Randomization history or null if not found</returns>
    private RandomizationHistory GetRandomizationHistory(string bucketId)
    {
        lock (this.lockObject)
        {
            return this.randomizationHistory.TryGetValue(bucketId, out RandomizationHistory history) ? history : null;
        }
    }

    /// <summary>
    /// Clean up completed spawn executions and their associated duration cleanup timers
    /// </summary>
    private void CleanupCompletedSpawns()
    {
        lock (this.lockObject)
        {
            List<ActiveSpawnExecution> completedSpawns = this.activeSpawns.Values
              .Where(execution => execution.Status != "Running" ||
                                 (execution.ExpectedEndTime.HasValue &&
                                  DateTime.UtcNow > execution.ExpectedEndTime.Value))
              .ToList();

            int cleanupTimersDisposed = 0;
            foreach (ActiveSpawnExecution execution in completedSpawns)
            {
                // Clean up duration cleanup timers for this spawn's tracked source GUIDs
                // Look for cleanup timers that match this spawn's tracked GUIDs
                List<string> timersToRemove = new List<string>();
                if (execution.SourceGuids != null && execution.SourceGuids.Count > 0)
                {
                    foreach (string timerKey in this.activeTimers.Keys)
                    {
                        if (timerKey.StartsWith("cleanup-"))
                        {
                            // Extract source name from timer key (format: "cleanup-{sourceName}")
                            string sourceName = timerKey.Substring(8); // Remove "cleanup-" prefix

                            // Check if this source GUID belongs to this spawn's tracked GUIDs
                            bool belongsToSpawn = execution.SourceGuids.Values.Contains(sourceName);

                            if (belongsToSpawn)
                            {
                                timersToRemove.Add(timerKey);
                            }
                        }
                    }
                }

                // Dispose cleanup timers for this spawn
                foreach (string timerKey in timersToRemove)
                {
                    try
                    {
                        if (this.activeTimers.TryGetValue(timerKey, out IDisposable timer))
                        {
                            timer.Dispose();
                            this.activeTimers.Remove(timerKey);
                            this.timerStates.Remove(timerKey);
                            cleanupTimersDisposed++;
                            LogExecution(LogLevel.Info, $"CleanupCompletedSpawns: Disposed cleanup timer for source '{timerKey.Substring(8)}'");
                        }
                    }
                    catch (Exception ex)
                    {
                        LogExecution(LogLevel.Warning, $"CleanupCompletedSpawns: Error disposing cleanup timer '{timerKey}': {ex.Message}");
                        // Still remove from dictionaries even if disposal failed
                        this.activeTimers.Remove(timerKey);
                        this.timerStates.Remove(timerKey);
                    }
                }

                // Remove the completed spawn execution
                this.activeSpawns.Remove(execution.ExecutionId);
                LogExecution(LogLevel.Info, $"StateManagement: Cleaned up completed execution {execution.ExecutionId}");
            }

            if (cleanupTimersDisposed > 0)
            {
                LogExecution(LogLevel.Info, $"CleanupCompletedSpawns: Disposed {cleanupTimersDisposed} duration cleanup timers");
            }
        }
    }

    /// <summary>
    /// Get current state summary
    /// </summary>
    /// <returns>State summary information</returns>
    private Dictionary<string, object> GetStateSummary()
    {
        lock (this.lockObject)
        {
            return new Dictionary<string, object>
            {
                ["activeSpawns"] = this.activeSpawns.Count,
                ["executionHistoryCount"] = this.executionHistory.Count,
                ["randomizationHistoryCount"] = this.randomizationHistory.Count,
                ["configCacheValid"] = IsConfigCacheValid(),
                ["configCacheAge"] = this.configCacheTimestamp == DateTime.MinValue ?
                "Never" : DateTime.UtcNow.Subtract(this.configCacheTimestamp).ToString(),
            };
        }
    }


    #endregion

    #region State Management Classes

    /// <summary>
    /// Represents an active spawn execution
    /// </summary>
    public class ActiveSpawnExecution
    {
        [JsonProperty("spawnId")]
        public string SpawnId { get; set; } = string.Empty;

        [JsonProperty("spawnName")]
        public string SpawnName { get; set; } = string.Empty;

        [JsonProperty("triggerType")]
        public string TriggerType { get; set; } = string.Empty;

        [JsonProperty("startTime")]
        public DateTime StartTime { get; set; }

        [JsonProperty("expectedEndTime")]
        public DateTime? ExpectedEndTime { get; set; }

        [JsonProperty("status")]
        public string Status { get; set; } = "Running"; // Running, Completed, Failed, Cancelled

        [JsonProperty("executionId")]
        public string ExecutionId { get; set; } = string.Empty;

        [JsonProperty("context")]
        public Dictionary<string, object> Context { get; set; } = new Dictionary<string, object>();

        [JsonProperty("sourceGuids")]
        public Dictionary<string, string> SourceGuids { get; set; } = new Dictionary<string, string>();

        [JsonProperty("sourceSceneItemIds")]
        public Dictionary<string, int> SourceSceneItemIds { get; set; } = new Dictionary<string, int>();
    }

    /// <summary>
    /// Represents an execution record for history tracking
    /// </summary>
    public class ExecutionRecord
    {
        [JsonProperty("executionId")]
        public string ExecutionId { get; set; } = string.Empty;

        [JsonProperty("spawnId")]
        public string SpawnId { get; set; } = string.Empty;

        [JsonProperty("spawnName")]
        public string SpawnName { get; set; } = string.Empty;

        [JsonProperty("triggerType")]
        public string TriggerType { get; set; } = string.Empty;

        [JsonProperty("startTime")]
        public DateTime StartTime { get; set; }

        [JsonProperty("endTime")]
        public DateTime? EndTime { get; set; }

        [JsonProperty("duration")]
        public TimeSpan? Duration => EndTime?.Subtract(StartTime);

        [JsonProperty("status")]
        public string Status { get; set; } = string.Empty; // Success, Failed, Canceled

        [JsonProperty("errorMessage")]
        public string ErrorMessage { get; set; } = string.Empty;

        [JsonProperty("context")]
        public Dictionary<string, object> Context { get; set; } = new Dictionary<string, object>();
    }

    /// <summary>
    /// Tracks randomization bucket selection history
    /// </summary>
    public class RandomizationHistory
    {
        [JsonProperty("bucketId")]
        public string BucketId { get; set; } = string.Empty;

        [JsonProperty("lastSelectedMembers")]
        public List<string> LastSelectedMembers { get; set; } = new List<string>();

        [JsonProperty("selectionCount")]
        public int SelectionCount { get; set; }

        [JsonProperty("lastSelectionTime")]
        public DateTime LastSelectionTime { get; set; }

        [JsonProperty("selectionPattern")]
        public List<string> SelectionPattern { get; set; } = new List<string>();

        [JsonProperty("maxPatternLength")]
        public int MaxPatternLength { get; set; } = 10;
    }


    /// <summary>
    /// Represents a spawn execution request in the queue
    /// </summary>
    public class SpawnExecutionRequest
    {
        [JsonProperty("requestId")]
        public string RequestId { get; set; } = string.Empty;

        [JsonProperty("spawnId")]
        public string SpawnId { get; set; } = string.Empty;

        [JsonProperty("triggerType")]
        public string TriggerType { get; set; } = string.Empty;

        [JsonProperty("context")]
        public Dictionary<string, object> Context { get; set; } = new Dictionary<string, object>();

        [JsonProperty("priority")]
        public int Priority { get; set; } // Higher number = higher priority

        [JsonProperty("requestTime")]
        public DateTime RequestTime { get; set; } = DateTime.UtcNow;
    }

    #endregion

    #region Utility Methods and Helpers

    /// <summary>
    /// Logs execution details with structured formatting
    /// </summary>
    /// <param name="level">Log level</param>
    /// <param name="message">Log message</param>
    /// <param name="context">Additional context data</param>
    private void LogExecution(LogLevel level, string message, Dictionary<string, object> context = null)
    {
        // Only log if the message level is at or above the current log level
        if (level < CurrentLogLevel)
            return;

        string contextStr = context != null ? $" | Context: {JsonConvert.SerializeObject(context)}" : "";

        string logMessage = $"{message}{contextStr}";

        switch (level)
        {
            case LogLevel.Debug:
                CPH.LogVerbose(logMessage);
                break;
            case LogLevel.Info:
                CPH.LogInfo(logMessage);
                break;
            case LogLevel.Warning:
                CPH.LogWarn(logMessage);
                break;
            case LogLevel.Error:
                CPH.LogError(logMessage);
                break;
        }
    }

    #endregion

    #region Utility Support Classes

    /// <summary>
    /// Result of asset path resolution
    /// </summary>
    public class AssetPathResolution
    {
        [JsonProperty("isValid")]
        public bool IsValid { get; set; }

        [JsonProperty("isLocalFile")]
        public bool IsLocalFile { get; set; }

        [JsonProperty("isUrl")]
        public bool IsUrl { get; set; }

        [JsonProperty("resolvedPath")]
        public string ResolvedPath { get; set; } = string.Empty;

        [JsonProperty("errorMessage")]
        public string ErrorMessage { get; set; } = string.Empty;
    }

    /// <summary>
    /// Log levels for structured logging
    /// </summary>
    public enum LogLevel
    {
        Debug = 0,
        Info = 1,
        Warning = 2,
        Error = 3,
    }

    /// <summary>
    /// OBS bounds types for scene item transforms
    /// </summary>
    public enum OBSBoundsType
    {
        /// <summary>
        /// No bounds applied
        /// </summary>
        None = 0,

        /// <summary>
        /// Stretch to fill bounds
        /// </summary>
        Stretch = 1,

        /// <summary>
        /// Scale to fit within bounds (inner)
        /// </summary>
        ScaleInner = 2,

        /// <summary>
        /// Scale to fill bounds (outer)
        /// </summary>
        ScaleOuter = 3,

        /// <summary>
        /// Scale to fit width
        /// </summary>
        ScaleToWidth = 4,

        /// <summary>
        /// Scale to fit height
        /// </summary>
        ScaleToHeight = 5,

        /// <summary>
        /// Scale to maximum only
        /// </summary>
        MaxOnly = 6
    }

    /// <summary>
    /// Partial type for AssetSettings to support optional properties
    /// </summary>
    public class PartialAssetSettings
    {
        public double? Width { get; set; }
        public double? Height { get; set; }
        public double? X { get; set; }
        public double? Y { get; set; }
        public double? Scale { get; set; }
        public string PositionMode { get; set; }
        public double? Volume { get; set; }
        public bool? Loop { get; set; }
        public bool? Autoplay { get; set; }
        public bool? Muted { get; set; }
    }

    /// <summary>
    /// Validates the execution environment before starting execution
    /// </summary>
    /// <returns>True if environment is valid, false otherwise</returns>
    private bool ValidateExecutionEnvironment()
    {
        try
        {
            LogExecution(LogLevel.Info, "ValidateExecutionEnvironment: Validating execution environment");


            // Check OBS connection
            if (!CPH.ObsIsConnected())
            {
                LogExecution(LogLevel.Warning, "ValidateExecutionEnvironment: OBS is not connected - some operations may fail");
            }

            // Check if we have access to required Streamer.bot methods
            try
            {
                string testSource = CPH.GetSource().ToString();
                if (CPH.TryGetArg("triggerName", out string testTriggerName))
                {
                    LogExecution(LogLevel.Info, $"ValidateExecutionEnvironment: Streamer.bot methods accessible - TriggerName: '{testTriggerName}', Source: '{testSource}'");
                }
                else
                {
                    LogExecution(LogLevel.Info, $"ValidateExecutionEnvironment: Streamer.bot methods accessible - Source: '{testSource}' (no triggerName available)");
                }
            }
            catch (Exception ex)
            {
                LogExecution(LogLevel.Error, $"ValidateExecutionEnvironment: Error accessing Streamer.bot methods: {ex.Message}");
                return false;
            }

            LogExecution(LogLevel.Info, "ValidateExecutionEnvironment: Environment validation completed successfully");
            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ValidateExecutionEnvironment: Unexpected error during validation: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Loads MediaSpawner configuration with retry logic
    /// </summary>
    /// <returns>True if configuration loaded successfully, false otherwise</returns>
    private bool LoadMediaSpawnerConfigWithRetry()
    {
        const int baseDelayMs = 1000;

        for (int attempt = 1; attempt <= MaxRetries + 1; attempt++)
        {
            try
            {
                LogExecution(LogLevel.Info, $"LoadMediaSpawnerConfigWithRetry: Attempt {attempt}/{MaxRetries + 1}");

                if (LoadMediaSpawnerConfig())
                {
                    LogExecution(LogLevel.Info, $"LoadMediaSpawnerConfigWithRetry: Configuration loaded successfully on attempt {attempt}");
                    return true;
                }

                if (attempt < MaxRetries + 1)
                {
                    int delayMs = baseDelayMs * attempt; // Exponential backoff
                    LogExecution(LogLevel.Warning, $"LoadMediaSpawnerConfigWithRetry: Attempt {attempt} failed, retrying in {delayMs}ms");
                    CPH.Wait(delayMs);
                }
            }
            catch (Exception ex)
            {
                LogExecution(LogLevel.Error, $"LoadMediaSpawnerConfigWithRetry: Error on attempt {attempt}: {ex.Message}");

                if (attempt < MaxRetries + 1)
                {
                    int delayMs = baseDelayMs * attempt;
                    LogExecution(LogLevel.Warning, $"LoadMediaSpawnerConfigWithRetry: Retrying in {delayMs}ms after exception");
                    CPH.Wait(delayMs);
                }
            }
        }

        LogExecution(LogLevel.Error, $"LoadMediaSpawnerConfigWithRetry: Failed to load configuration after {MaxRetries + 1} attempts");
        return false;
    }

    /// <summary>
    /// Executes OBS operation with retry logic and timeout handling
    /// </summary>
    /// <param name="operationName">Name of the operation for logging</param>
    /// <param name="operation">The OBS operation to execute</param>
    /// <param name="maxRetries">Maximum number of retries (default: uses MaxRetries constant)</param>
    /// <param name="timeoutMs">Timeout in milliseconds for each operation attempt (default: 10000)</param>
    /// <returns>True if operation succeeded, false otherwise</returns>
    private bool ExecuteOBSOperationWithRetry(string operationName, Func<bool> operation, int maxRetries = -1, int timeoutMs = 10000)
    {
        const int baseDelayMs = 500;

        // Use MaxRetries constant if maxRetries is -1 (default)
        if (maxRetries == -1)
        {
            maxRetries = MaxRetries;
        }

        for (int attempt = 1; attempt <= maxRetries + 1; attempt++)
        {
            try
            {
                LogExecution(LogLevel.Info, $"ExecuteOBSOperationWithRetry: {operationName} - Attempt {attempt}/{maxRetries + 1} (timeout: {timeoutMs}ms)");

                // Execute operation with timeout
                bool result = ExecuteWithTimeout(operation, timeoutMs, operationName);

                if (result)
                {
                    LogExecution(LogLevel.Info, $"ExecuteOBSOperationWithRetry: {operationName} succeeded on attempt {attempt}");
                    return true;
                }

                if (attempt < maxRetries + 1)
                {
                    int delayMs = baseDelayMs * attempt; // Exponential backoff
                    LogExecution(LogLevel.Warning, $"ExecuteOBSOperationWithRetry: {operationName} failed on attempt {attempt}, retrying in {delayMs}ms");
                    CPH.Wait(delayMs);
                }
            }
            catch (Exception ex)
            {
                LogExecution(LogLevel.Error, $"ExecuteOBSOperationWithRetry: {operationName} error on attempt {attempt}: {ex.Message}");

                if (attempt < maxRetries + 1)
                {
                    int delayMs = baseDelayMs * attempt;
                    LogExecution(LogLevel.Warning, $"ExecuteOBSOperationWithRetry: {operationName} retrying in {delayMs}ms after exception");
                    CPH.Wait(delayMs);
                }
            }
        }

        LogExecution(LogLevel.Error, $"ExecuteOBSOperationWithRetry: {operationName} failed after {maxRetries + 1} attempts");
        return false;
    }

    /// <summary>
    /// Executes an operation with a timeout
    /// </summary>
    /// <param name="operation">The operation to execute</param>
    /// <param name="timeoutMs">Timeout in milliseconds</param>
    /// <param name="operationName">Name of the operation for logging</param>
    /// <returns>True if operation completed successfully within timeout, false otherwise</returns>
    private bool ExecuteWithTimeout(Func<bool> operation, int timeoutMs, string operationName)
    {
        Task<bool> task = Task.Run(operation);

        if (task.Wait(timeoutMs))
        {
            return task.Result;
        }
        else
        {
            LogExecution(LogLevel.Error, $"ExecuteWithTimeout: {operationName} timed out after {timeoutMs}ms");
            return false;
        }
    }

    /// <summary>
    /// Validates input parameters for public methods
    /// </summary>
    /// <param name="methodName">Name of the method for logging</param>
    /// <param name="parameters">Dictionary of parameter names and values to validate</param>
    /// <returns>True if all parameters are valid, false otherwise</returns>
    private bool ValidateInputParameters(string methodName, Dictionary<string, object> parameters)
    {
        try
        {
            foreach (KeyValuePair<string, object> kvp in parameters)
            {
                if (kvp.Value == null)
                {
                    LogExecution(LogLevel.Error, $"ValidateInputParameters: {methodName} - Parameter '{kvp.Key}' is null");
                    return false;
                }

                if (kvp.Value is string str && string.IsNullOrWhiteSpace(str))
                {
                    LogExecution(LogLevel.Error, $"ValidateInputParameters: {methodName} - Parameter '{kvp.Key}' is null or whitespace");
                    return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ValidateInputParameters: {methodName} - Error validating parameters: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Creates a structured error message with context
    /// </summary>
    /// <param name="operation">Operation that failed</param>
    /// <param name="error">The error that occurred</param>
    /// <param name="context">Additional context information</param>
    /// <returns>Formatted error message</returns>
    private string CreateStructuredErrorMessage(string operation, Exception error, Dictionary<string, object> context = null)
    {
        Dictionary<string, object> errorInfo = new Dictionary<string, object>
        {
            ["operation"] = operation,
            ["error"] = error.Message,
            ["type"] = error.GetType().Name,
            ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"),
        };

        if (context != null)
        {
            errorInfo["context"] = context;
        }

        if (error.InnerException != null)
        {
            errorInfo["innerError"] = new Dictionary<string, object>
            {
                ["message"] = error.InnerException.Message,
                ["type"] = error.InnerException.GetType().Name,
            };
        }

        return JsonConvert.SerializeObject(errorInfo, Formatting.Indented);
    }

    /// <summary>
    /// Tries to find a fallback asset when the primary asset is missing
    /// </summary>
    /// <param name="spawnAsset">The spawn asset that's missing</param>
    /// <param name="fallbackAsset">The fallback asset if found</param>
    /// <returns>True if a fallback asset was found</returns>
    private bool TryFindFallbackAsset(SpawnAsset spawnAsset, out MediaAsset fallbackAsset)
    {
        fallbackAsset = null;

        try
        {
            if (this.cachedConfig?.Assets == null || this.cachedConfig.Assets.Count == 0)
            {
                return false;
            }

            // Try to find an asset of the same type
            List<MediaAsset> sameTypeAssets = this.cachedConfig.Assets.Where(a =>
              a.Type.Equals(spawnAsset.AssetId.Split('.')[0], StringComparison.OrdinalIgnoreCase)).ToList();

            if (sameTypeAssets.Count > 0)
            {
                // Use the first available asset of the same type
                fallbackAsset = sameTypeAssets[0];
                LogExecution(LogLevel.Info, $"TryFindFallbackAsset: Found fallback asset '{fallbackAsset.Name}' of type '{fallbackAsset.Type}'");
                return true;
            }

            // Try to find any asset as a last resort
            if (this.cachedConfig.Assets.Count > 0)
            {
                fallbackAsset = this.cachedConfig.Assets[0];
                LogExecution(LogLevel.Info, $"TryFindFallbackAsset: Using first available asset '{fallbackAsset.Name}' as fallback");
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"TryFindFallbackAsset: Error finding fallback asset: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Logs asset execution when OBS is not available
    /// </summary>
    /// <param name="spawn">The parent spawn</param>
    /// <param name="spawnAsset">The spawn asset being executed</param>
    /// <param name="baseAsset">The base asset</param>
    /// <param name="contextData">Additional context data</param>
    private void LogAssetExecutionWithoutOBS(Spawn spawn, SpawnAsset spawnAsset, MediaAsset baseAsset, Dictionary<string, object> contextData)
    {
        try
        {
            Dictionary<string, object> executionLog = new Dictionary<string, object>
            {
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"),
                ["spawnName"] = spawn?.Name,
                ["spawnId"] = spawn?.Id,
                ["assetId"] = spawnAsset?.AssetId,
                ["assetName"] = baseAsset?.Name,
                ["assetType"] = baseAsset?.Type,
                ["assetPath"] = baseAsset?.Path,
                ["contextData"] = contextData,
                ["reason"] = "OBS not connected - execution logged for debugging",
            };

            string logMessage = JsonConvert.SerializeObject(executionLog, Formatting.Indented);
            LogExecution(LogLevel.Info, $"LogAssetExecutionWithoutOBS: {logMessage}");
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"LogAssetExecutionWithoutOBS: Error logging asset execution: {ex.Message}");
        }
    }

    /// <summary>
    /// Attempts to recover from partial failures in spawn execution
    /// </summary>
    /// <param name="spawn">The spawn being executed</param>
    /// <param name="failedAssets">List of assets that failed to execute</param>
    /// <param name="triggerType">The trigger type that activated the spawn</param>
    /// <param name="contextData">Additional context data</param>
    /// <returns>True if recovery was successful or partial recovery was achieved</returns>
    private bool AttemptSpawnRecovery(Spawn spawn, List<SpawnAsset> failedAssets, string triggerType, Dictionary<string, object> contextData)
    {
        try
        {
            LogExecution(LogLevel.Info, $"AttemptSpawnRecovery: Attempting recovery for spawn '{spawn.Name}' with {failedAssets?.Count} failed assets");

            if (failedAssets == null || failedAssets.Count == 0)
            {
                LogExecution(LogLevel.Info, "AttemptSpawnRecovery: No failed assets to recover from");
                return true;
            }

            int recoveredAssets = 0;
            int totalRecoveryAttempts = 0;

            foreach (SpawnAsset failedAsset in failedAssets)
            {
                totalRecoveryAttempts++;

                try
                {
                    LogExecution(LogLevel.Info, $"AttemptSpawnRecovery: Attempting recovery for asset '{failedAsset.AssetId}' (attempt {totalRecoveryAttempts})");

                    // Try to find a fallback asset
                    if (TryFindFallbackAsset(failedAsset, out MediaAsset fallbackAsset))
                    {
                        LogExecution(LogLevel.Info, $"AttemptSpawnRecovery: Using fallback asset '{fallbackAsset.Name}' for failed asset '{failedAsset.AssetId}'");

                        // Try to execute with the fallback asset
                        bool recoveryResult = ExecuteSpawnAssetWithFallback(spawn, failedAsset, fallbackAsset, triggerType, contextData);

                        if (recoveryResult)
                        {
                            recoveredAssets++;
                            LogExecution(LogLevel.Info, $"AttemptSpawnRecovery: Successfully recovered asset '{failedAsset.AssetId}' using fallback");
                        }
                        else
                        {
                            LogExecution(LogLevel.Warning, $"AttemptSpawnRecovery: Failed to recover asset '{failedAsset.AssetId}' even with fallback");
                        }
                    }
                    else
                    {
                        LogExecution(LogLevel.Warning, $"AttemptSpawnRecovery: No fallback asset available for failed asset '{failedAsset.AssetId}'");
                    }
                }
                catch (Exception ex)
                {
                    LogExecution(LogLevel.Error, $"AttemptSpawnRecovery: Error during recovery attempt for asset '{failedAsset.AssetId}': {ex.Message}");
                }
            }

            double recoveryRate = totalRecoveryAttempts > 0 ? (double)recoveredAssets / totalRecoveryAttempts : 0.0;

            Dictionary<string, object> recoverySummary = new Dictionary<string, object>
            {
                ["spawnName"] = spawn?.Name,
                ["spawnId"] = spawn?.Id,
                ["totalFailedAssets"] = failedAssets.Count,
                ["recoveryAttempts"] = totalRecoveryAttempts,
                ["recoveredAssets"] = recoveredAssets,
                ["recoveryRate"] = recoveryRate,
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"),
            };

            LogExecution(LogLevel.Info, $"AttemptSpawnRecovery: Recovery completed. Summary: {JsonConvert.SerializeObject(recoverySummary)}");

            // Consider recovery successful if we recovered at least some assets or if there were no assets to recover
            return recoveredAssets > 0 || totalRecoveryAttempts == 0;
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"AttemptSpawnRecovery: Unexpected error during recovery: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Executes a spawn asset with a fallback asset
    /// </summary>
    /// <param name="spawn">The parent spawn</param>
    /// <param name="originalAsset">The original spawn asset that failed</param>
    /// <param name="fallbackAsset">The fallback asset to use</param>
    /// <param name="triggerType">The trigger type</param>
    /// <param name="contextData">Additional context data</param>
    /// <returns>True if execution with fallback was successful</returns>
    private bool ExecuteSpawnAssetWithFallback(Spawn spawn, SpawnAsset originalAsset, MediaAsset fallbackAsset, string triggerType, Dictionary<string, object> contextData)
    {
        try
        {
            LogExecution(LogLevel.Info, $"ExecuteSpawnAssetWithFallback: Executing fallback asset '{fallbackAsset.Name}' for original asset '{originalAsset.AssetId}'");

            // Create a temporary spawn asset with the fallback asset's properties
            SpawnAsset fallbackSpawnAsset = new SpawnAsset
            {
                Id = originalAsset.Id, // Keep the same ID for OBS source naming
                AssetId = fallbackAsset.Id,
                Enabled = originalAsset.Enabled,
                Order = originalAsset.Order,
                Overrides = originalAsset.Overrides, // Keep original overrides
            };

            // Execute the fallback asset
            return ExecuteSpawnAsset(spawn, fallbackSpawnAsset, triggerType, contextData, out _);
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"ExecuteSpawnAssetWithFallback: Error executing fallback asset: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Cleans up partial execution state when recovery fails
    /// </summary>
    /// <param name="spawn">The spawn that had partial failures</param>
    /// <param name="successfulAssets">Assets that were successfully executed</param>
    /// <param name="failedAssets">Assets that failed to execute</param>
    /// <param name="executionId">The execution ID for tracking (optional)</param>
    private void CleanupPartialExecution(Spawn spawn, List<SpawnAsset> successfulAssets, List<SpawnAsset> failedAssets, string executionId = null)
    {
        try
        {
            LogExecution(LogLevel.Info, $"CleanupPartialExecution: Cleaning up partial execution for spawn '{spawn.Name}'");

            // Clean up successfully created OBS sources
            if (successfulAssets != null)
            {
                foreach (SpawnAsset asset in successfulAssets)
                {
                    try
                    {
                        // Get the tracked GUID for this asset
                        string sourceGuid = null;
                        if (!string.IsNullOrEmpty(executionId))
                        {
                            lock (this.lockObject)
                            {
                                var activeExecution = this.activeSpawns.Values.FirstOrDefault(e => e.SpawnId == spawn.Id);
                                if (activeExecution != null && activeExecution.SourceGuids.TryGetValue(asset.Id, out sourceGuid))
                                {
                                    // Look up sceneItemId for the tracked GUID
                                    int sceneItemId = -1;
                                    if (activeExecution.SourceSceneItemIds.TryGetValue(sourceGuid, out sceneItemId) && sceneItemId > 0)
                                    {
                                        // Hide and delete the OBS source using the tracked GUID and sceneItemId
                                        HideOBSSource(sourceGuid);
                                        DeleteOBSSource(sourceGuid, sceneItemId);
                                        LogExecution(LogLevel.Info, $"CleanupPartialExecution: Cleaned up OBS source for asset '{asset.AssetId}' with GUID '{sourceGuid}' (sceneItemId: {sceneItemId})");
                                    }
                                    else
                                    {
                                        // Fallback to using asset.Id if no sceneItemId is found
                                        HideOBSSource(asset.Id);
                                        DeleteOBSSource(asset.Id, -1);
                                        LogExecution(LogLevel.Warning, $"CleanupPartialExecution: No tracked sceneItemId found for asset '{asset.AssetId}' with GUID '{sourceGuid}', used asset ID as fallback");
                                    }
                                }
                                else
                                {
                                    // Fallback to using asset.Id if no GUID is found
                                    HideOBSSource(asset.Id);
                                    DeleteOBSSource(asset.Id, -1);
                                    LogExecution(LogLevel.Warning, $"CleanupPartialExecution: No tracked GUID found for asset '{asset.AssetId}', used asset ID as fallback");
                                }
                            }
                        }
                        else
                        {
                            // Fallback to using asset.Id if no execution ID is provided
                            HideOBSSource(asset.Id);
                            DeleteOBSSource(asset.Id, -1);
                            LogExecution(LogLevel.Warning, $"CleanupPartialExecution: No execution ID provided, used asset ID '{asset.Id}' as fallback");
                        }
                    }
                    catch (Exception ex)
                    {
                        LogExecution(LogLevel.Warning, $"CleanupPartialExecution: Error cleaning up asset '{asset.AssetId}': {ex.Message}");
                    }
                }
            }

            // Log failed assets for debugging
            if (failedAssets != null && failedAssets.Count > 0)
            {
                List<string> failedAssetIds = failedAssets.Select(a => a.AssetId).ToList();
                LogExecution(LogLevel.Warning, $"CleanupPartialExecution: Failed assets that were not cleaned up: {string.Join(", ", failedAssetIds)}");
            }

            LogExecution(LogLevel.Info, $"CleanupPartialExecution: Cleanup completed for spawn '{spawn.Name}'");
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"CleanupPartialExecution: Error during cleanup: {ex.Message}");
        }
    }

    /// <summary>
    /// Logs a structured information message with context
    /// </summary>
    /// <param name="operation">The operation being performed</param>
    /// <param name="message">The message to log</param>
    /// <param name="context">Additional context information</param>
    private void LogStructuredInfo(string operation, string message, Dictionary<string, object> context = null)
    {
        try
        {
            Dictionary<string, object> logData = new Dictionary<string, object>
            {
                ["level"] = "INFO",
                ["operation"] = operation,
                ["message"] = message,
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"),
            };

            if (context != null)
            {
                logData["context"] = context;
            }

            string logMessage = JsonConvert.SerializeObject(logData, Formatting.Indented);
            LogExecution(LogLevel.Info, $"LogStructuredInfo: {logMessage}");
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"LogStructuredInfo: Error creating structured log: {ex.Message}");
            // Fallback to simple logging
            LogExecution(LogLevel.Info, $"{operation}: {message}");
        }
    }

    /// <summary>
    /// Logs a structured warning message with context
    /// </summary>
    /// <param name="operation">The operation being performed</param>
    /// <param name="message">The message to log</param>
    /// <param name="context">Additional context information</param>
    private void LogStructuredWarning(string operation, string message, Dictionary<string, object> context = null)
    {
        try
        {
            Dictionary<string, object> logData = new Dictionary<string, object>
            {
                ["level"] = "WARNING",
                ["operation"] = operation,
                ["message"] = message,
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"),
            };

            if (context != null)
            {
                logData["context"] = context;
            }

            string logMessage = JsonConvert.SerializeObject(logData, Formatting.Indented);
            LogExecution(LogLevel.Warning, $"LogStructuredWarning: {logMessage}");
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"LogStructuredWarning: Error creating structured log: {ex.Message}");
            // Fallback to simple logging
            LogExecution(LogLevel.Warning, $"{operation}: {message}");
        }
    }

    /// <summary>
    /// Logs a structured error message with context
    /// </summary>
    /// <param name="operation">The operation being performed</param>
    /// <param name="message">The message to log</param>
    /// <param name="context">Additional context information</param>
    private void LogStructuredError(string operation, string message, Dictionary<string, object> context = null)
    {
        try
        {
            Dictionary<string, object> logData = new Dictionary<string, object>
            {
                ["level"] = "ERROR",
                ["operation"] = operation,
                ["message"] = message,
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"),
            };

            if (context != null)
            {
                logData["context"] = context;
            }

            string logMessage = JsonConvert.SerializeObject(logData, Formatting.Indented);
            LogExecution(LogLevel.Error, $"LogStructuredError: {logMessage}");
        }
        catch (Exception ex)
        {
            LogExecution(LogLevel.Error, $"LogStructuredError: Error creating structured log: {ex.Message}");
            // Fallback to simple logging
            LogExecution(LogLevel.Error, $"{operation}: {message}");
        }
    }

    #endregion
}