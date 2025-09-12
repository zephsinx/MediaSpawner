using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Newtonsoft.Json;

public class CPHInline
{
  private const string MediaSpawnerConfigGuid = "59d16b77-5aa7-4336-9b18-eeb6af51a823";
  private readonly string MediaSpawnerConfigVarName = $"MediaSpawnerConfig-{MediaSpawnerConfigGuid}";
  private readonly string MediaSpawnerShaVarName = $"MediaSpawnerSha-{MediaSpawnerConfigGuid}";

  /// <summary>
  /// Main entry point for MediaSpawner spawn execution
  /// Handles trigger detection, routing, and spawn execution coordination
  /// </summary>
  /// <returns>True if execution succeeded, false otherwise</returns>
  public bool Execute()
  {
    try
    {
      // Load configuration first
      if (!LoadMediaSpawnerConfig())
      {
        CPH.LogError("Execute: Failed to load MediaSpawner configuration");
        return false;
      }

      // Detect trigger type and source
      string eventType = CPH.GetEventType();
      string source = CPH.GetSource();

      CPH.LogInfo($"Execute: Trigger detected - EventType: {eventType}, Source: {source}");

      // Route to appropriate handler based on trigger type
      bool executionResult = false;

      switch (eventType?.ToLowerInvariant())
      {
        case "command":
          executionResult = HandleCommandTrigger(source);
          break;

        case "twitch":
          executionResult = HandleTwitchTrigger(source);
          break;

        case "time":
          executionResult = HandleTimeTrigger(source);
          break;

        case "manual":
        case "c# method":
          executionResult = HandleManualTrigger();
          break;

        default:
          CPH.LogWarn($"Execute: Unknown trigger type '{eventType}' from source '{source}'");
          return false;
      }

      if (executionResult)
      {
        CPH.LogInfo("Execute: Spawn execution completed successfully");
      }
      else
      {
        CPH.LogWarn("Execute: Spawn execution completed with issues");
      }

      return executionResult;
    }
    catch (Exception ex)
    {
      CPH.LogError($"Execute: Unexpected error during execution: {ex.Message}");
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
      CPH.LogInfo($"HandleCommandTrigger: Processing command trigger from source: {source}");

      // Get command details from Streamer.bot
      if (!CPH.TryGetArg("command", out string command) || string.IsNullOrWhiteSpace(command))
      {
        CPH.LogError("HandleCommandTrigger: No command argument provided");
        return false;
      }

      // Get additional command context
      CPH.TryGetArg("userId", out string userId);
      CPH.TryGetArg("userName", out string userName);
      CPH.TryGetArg("rawInput", out string rawInput);

      CPH.LogInfo($"HandleCommandTrigger: Command '{command}' from user '{userName}' (ID: {userId})");

      // Find matching spawns with streamerbot.command triggers
      List<Spawn> matchingSpawns = FindSpawnsByTriggerType("streamerbot.command");

      if (matchingSpawns.Count == 0)
      {
        CPH.LogInfo("HandleCommandTrigger: No spawns found with streamerbot.command triggers");
        return true; // Not an error, just no matching spawns
      }

      // Filter spawns based on command configuration
      List<Spawn> validSpawns = FilterSpawnsByCommandConfig(matchingSpawns, command, userName, rawInput);

      if (validSpawns.Count == 0)
      {
        CPH.LogInfo("HandleCommandTrigger: No spawns match the command configuration");
        return true; // Not an error, just no matching spawns
      }

      // Execute matching spawns
      return ExecuteSpawns(validSpawns, "command", new Dictionary<string, object>
      {
        ["command"] = command,
        ["userId"] = userId,
        ["userName"] = userName,
        ["rawInput"] = rawInput,
        ["source"] = source
      });
    }
    catch (Exception ex)
    {
      CPH.LogError($"HandleCommandTrigger: Error processing command trigger: {ex.Message}");
      return false;
    }
  }

  /// <summary>
  /// Handle Twitch event-based triggers
  /// </summary>
  /// <param name="source">The Twitch event source</param>
  /// <returns>True if event was handled successfully</returns>
  private bool HandleTwitchTrigger(string source)
  {
    try
    {
      CPH.LogInfo($"HandleTwitchTrigger: Processing Twitch trigger from source: {source}");

      // Determine specific Twitch event type
      string twitchEventType = DetermineTwitchEventType(source);

      if (string.IsNullOrWhiteSpace(twitchEventType))
      {
        CPH.LogError($"HandleTwitchTrigger: Unable to determine Twitch event type from source: {source}");
        return false;
      }

      CPH.LogInfo($"HandleTwitchTrigger: Detected Twitch event type: {twitchEventType}");

      // Find matching spawns with Twitch triggers
      List<Spawn> matchingSpawns = FindSpawnsByTriggerType($"twitch.{twitchEventType}");

      if (matchingSpawns.Count == 0)
      {
        CPH.LogInfo($"HandleTwitchTrigger: No spawns found with twitch.{twitchEventType} triggers");
        return true; // Not an error, just no matching spawns
      }

      // Get Twitch event data
      Dictionary<string, object> eventData = GetTwitchEventData(twitchEventType);

      // Filter spawns based on Twitch event configuration
      List<Spawn> validSpawns = FilterSpawnsByTwitchConfig(matchingSpawns, twitchEventType, eventData);

      if (validSpawns.Count == 0)
      {
        CPH.LogInfo("HandleTwitchTrigger: No spawns match the Twitch event configuration");
        return true; // Not an error, just no matching spawns
      }

      // Execute matching spawns
      return ExecuteSpawns(validSpawns, $"twitch.{twitchEventType}", eventData);
    }
    catch (Exception ex)
    {
      CPH.LogError($"HandleTwitchTrigger: Error processing Twitch trigger: {ex.Message}");
      return false;
    }
  }

  /// <summary>
  /// Handle time-based triggers
  /// </summary>
  /// <param name="source">The time trigger source</param>
  /// <returns>True if time trigger was handled successfully</returns>
  private bool HandleTimeTrigger(string source)
  {
    try
    {
      CPH.LogInfo($"HandleTimeTrigger: Processing time trigger from source: {source}");

      // Determine specific time trigger type
      string timeTriggerType = DetermineTimeTriggerType(source);

      if (string.IsNullOrWhiteSpace(timeTriggerType))
      {
        CPH.LogError($"HandleTimeTrigger: Unable to determine time trigger type from source: {source}");
        return false;
      }

      CPH.LogInfo($"HandleTimeTrigger: Detected time trigger type: {timeTriggerType}");

      // Find matching spawns with time triggers
      List<Spawn> matchingSpawns = FindSpawnsByTriggerType($"time.{timeTriggerType}");

      if (matchingSpawns.Count == 0)
      {
        CPH.LogInfo($"HandleTimeTrigger: No spawns found with time.{timeTriggerType} triggers");
        return true; // Not an error, just no matching spawns
      }

      // Get current time context
      Dictionary<string, object> timeData = GetTimeTriggerData(timeTriggerType);

      // Filter spawns based on time trigger configuration
      List<Spawn> validSpawns = FilterSpawnsByTimeConfig(matchingSpawns, timeTriggerType, timeData);

      if (validSpawns.Count == 0)
      {
        CPH.LogInfo("HandleTimeTrigger: No spawns match the time trigger configuration");
        return true; // Not an error, just no matching spawns
      }

      // Execute matching spawns
      return ExecuteSpawns(validSpawns, $"time.{timeTriggerType}", timeData);
    }
    catch (Exception ex)
    {
      CPH.LogError($"HandleTimeTrigger: Error processing time trigger: {ex.Message}");
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
      CPH.LogInfo("HandleManualTrigger: Processing manual trigger");

      // Get spawn ID from arguments if provided
      if (!CPH.TryGetArg("spawnId", out string spawnId) || string.IsNullOrWhiteSpace(spawnId))
      {
        CPH.LogError("HandleManualTrigger: No spawnId argument provided for manual trigger");
        return false;
      }

      // Find the specific spawn
      Spawn targetSpawn = FindSpawnById(spawnId);

      if (targetSpawn == null)
      {
        CPH.LogError($"HandleManualTrigger: Spawn with ID '{spawnId}' not found");
        return false;
      }

      if (!targetSpawn.Enabled)
      {
        CPH.LogWarn($"HandleManualTrigger: Spawn '{targetSpawn.Name}' is disabled");
        return false;
      }

      if (targetSpawn.Trigger.Type != "manual")
      {
        CPH.LogWarn($"HandleManualTrigger: Spawn '{targetSpawn.Name}' is not configured for manual triggers");
        return false;
      }

      // Execute the specific spawn
      return ExecuteSpawns(new List<Spawn> { targetSpawn }, "manual", new Dictionary<string, object>
      {
        ["spawnId"] = spawnId,
        ["triggerType"] = "manual"
      });
    }
    catch (Exception ex)
    {
      CPH.LogError($"HandleManualTrigger: Error processing manual trigger: {ex.Message}");
      return false;
    }
  }

  #region Helper Methods for Execute()

  /// <summary>
  /// Find spawns by trigger type across all profiles
  /// </summary>
  /// <param name="triggerType">The trigger type to search for</param>
  /// <returns>List of matching spawns</returns>
  private List<Spawn> FindSpawnsByTriggerType(string triggerType)
  {
    List<Spawn> matchingSpawns = new List<Spawn>();

    if (_cachedConfig?.Profiles == null)
      return matchingSpawns;

    foreach (SpawnProfile profile in _cachedConfig.Profiles)
    {
      if (profile.Spawns != null)
      {
        foreach (Spawn spawn in profile.Spawns)
        {
          if (spawn.Enabled && spawn.Trigger?.Type == triggerType)
          {
            matchingSpawns.Add(spawn);
          }
        }
      }
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
    if (_cachedConfig?.Profiles == null || string.IsNullOrWhiteSpace(spawnId))
      return null;

    foreach (SpawnProfile profile in _cachedConfig.Profiles)
    {
      if (profile.Spawns != null)
      {
        Spawn spawn = profile.Spawns.FirstOrDefault(s => s.Id == spawnId);
        if (spawn != null)
          return spawn;
      }
    }

    return null;
  }

  /// <summary>
  /// Filter spawns based on command configuration
  /// </summary>
  /// <param name="spawns">List of spawns to filter</param>
  /// <param name="command">The command that triggered</param>
  /// <param name="userName">The user who triggered the command</param>
  /// <param name="rawInput">The raw command input</param>
  /// <returns>List of spawns that match the command configuration</returns>
  private List<Spawn> FilterSpawnsByCommandConfig(List<Spawn> spawns, string command, string userName, string rawInput)
  {
    List<Spawn> validSpawns = new List<Spawn>();

    foreach (Spawn spawn in spawns)
    {
      if (spawn.Trigger?.Type != "streamerbot.command")
        continue;

      var config = spawn.Trigger.Config;
      if (config == null)
        continue;

      // Check if command matches aliases
      bool commandMatches = false;
      if (config.ContainsKey("aliases") && config["aliases"] is List<object> aliases)
      {
        foreach (object alias in aliases)
        {
          if (alias is string aliasStr && !string.IsNullOrWhiteSpace(aliasStr))
          {
            bool caseSensitive = config.ContainsKey("caseSensitive") &&
                               config["caseSensitive"] is bool cs && cs;

            if (caseSensitive ? command == aliasStr : command.Equals(aliasStr, StringComparison.OrdinalIgnoreCase))
            {
              commandMatches = true;
              break;
            }
          }
        }
      }

      // Check command ID if provided
      if (!commandMatches && config.ContainsKey("commandId") && config["commandId"] is string commandId)
      {
        // For now, we'll use the command string as a fallback
        // In future implementation, this would match against actual Streamer.bot command IDs
        commandMatches = command.Equals(commandId, StringComparison.OrdinalIgnoreCase);
      }

      if (commandMatches)
      {
        validSpawns.Add(spawn);
      }
    }

    return validSpawns;
  }

  /// <summary>
  /// Determine the specific Twitch event type from the source
  /// </summary>
  /// <param name="source">The Twitch event source</param>
  /// <returns>The specific Twitch event type</returns>
  private string DetermineTwitchEventType(string source)
  {
    if (string.IsNullOrWhiteSpace(source))
      return null;

    // Map Streamer.bot Twitch event sources to our trigger types
    switch (source.ToLowerInvariant())
    {
      case "follow":
        return "follow";
      case "cheer":
      case "bits":
        return "cheer";
      case "subscription":
      case "sub":
        return "subscription";
      case "giftsub":
      case "giftsubscription":
        return "giftSub";
      case "channelpoint":
      case "channelpointreward":
        return "channelPointReward";
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

      var config = spawn.Trigger.Config;
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
  /// Determine the specific time trigger type from the source
  /// </summary>
  /// <param name="source">The time trigger source</param>
  /// <returns>The specific time trigger type</returns>
  private string DetermineTimeTriggerType(string source)
  {
    if (string.IsNullOrWhiteSpace(source))
      return null;

    // Map Streamer.bot time event sources to our trigger types
    switch (source.ToLowerInvariant())
    {
      case "datetime":
      case "atdatetime":
        return "atDateTime";
      case "daily":
      case "dailyat":
        return "dailyAt";
      case "weekly":
      case "weeklyat":
        return "weeklyAt";
      case "monthly":
      case "monthlyon":
        return "monthlyOn";
      case "interval":
      case "everynminutes":
        return "everyNMinutes";
      case "minuteofhour":
        return "minuteOfHour";
      default:
        return null;
    }
  }

  /// <summary>
  /// Get time trigger data for the current context
  /// </summary>
  /// <param name="triggerType">The time trigger type</param>
  /// <returns>Dictionary containing time data</returns>
  private Dictionary<string, object> GetTimeTriggerData(string triggerType)
  {
    DateTime now = DateTime.Now;

    Dictionary<string, object> timeData = new Dictionary<string, object>
    {
      ["triggerType"] = triggerType,
      ["currentTime"] = now,
      ["currentTimeIso"] = now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
      ["currentHour"] = now.Hour,
      ["currentMinute"] = now.Minute,
      ["currentDayOfWeek"] = (int)now.DayOfWeek,
      ["currentDayOfMonth"] = now.Day
    };

    return timeData;
  }

  /// <summary>
  /// Filter spawns based on time trigger configuration
  /// </summary>
  /// <param name="spawns">List of spawns to filter</param>
  /// <param name="triggerType">The time trigger type</param>
  /// <param name="timeData">The current time data</param>
  /// <returns>List of spawns that match the time trigger configuration</returns>
  private List<Spawn> FilterSpawnsByTimeConfig(List<Spawn> spawns, string triggerType, Dictionary<string, object> timeData)
  {
    List<Spawn> validSpawns = new List<Spawn>();

    foreach (Spawn spawn in spawns)
    {
      if (spawn.Trigger?.Type != $"time.{triggerType}")
        continue;

      var config = spawn.Trigger.Config;
      if (config == null)
        continue;

      bool matches = true;

      // Apply time-specific filtering
      switch (triggerType)
      {
        case "atDateTime":
          if (config.ContainsKey("isoDateTime") && config["isoDateTime"] is string isoDateTime)
          {
            if (DateTime.TryParse(isoDateTime, out DateTime targetTime))
            {
              DateTime now = (DateTime)timeData["currentTime"];
              // For exact datetime triggers, we need to check if we're within a reasonable window
              // This is a simplified check - in practice, you'd want more sophisticated timing logic
              if (Math.Abs((now - targetTime).TotalMinutes) > 1)
                matches = false;
            }
          }
          break;

        case "dailyAt":
          if (config.ContainsKey("time") && config["time"] is string timeStr)
          {
            if (TimeSpan.TryParse(timeStr, out TimeSpan targetTime))
            {
              DateTime now = (DateTime)timeData["currentTime"];
              TimeSpan currentTime = now.TimeOfDay;
              // Check if we're within 1 minute of the target time
              if (Math.Abs((currentTime - targetTime).TotalMinutes) > 1)
                matches = false;
            }
          }
          break;

        case "minuteOfHour":
          if (config.ContainsKey("minute") && config["minute"] is int targetMinute)
          {
            int currentMinute = (int)timeData["currentMinute"];
            if (currentMinute != targetMinute)
              matches = false;
          }
          break;

        // Additional time trigger types would be implemented here
        // For now, we'll allow other time triggers to pass through
        default:
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
  /// Execute a list of spawns with the given trigger context
  /// </summary>
  /// <param name="spawns">List of spawns to execute</param>
  /// <param name="triggerType">The type of trigger that activated these spawns</param>
  /// <param name="contextData">Additional context data for the execution</param>
  /// <returns>True if all spawns executed successfully</returns>
  private bool ExecuteSpawns(List<Spawn> spawns, string triggerType, Dictionary<string, object> contextData)
  {
    if (spawns == null || spawns.Count == 0)
      return true;

    bool allSuccessful = true;

    foreach (Spawn spawn in spawns)
    {
      try
      {
        CPH.LogInfo($"ExecuteSpawns: Executing spawn '{spawn.Name}' (ID: {spawn.Id})");

        // Set spawn context in global variables for other actions
        CPH.SetGlobalVar("MediaSpawner_CurrentSpawn", JsonConvert.SerializeObject(spawn), persisted: false);
        CPH.SetGlobalVar("MediaSpawner_CurrentSpawnId", spawn.Id, persisted: false);
        CPH.SetGlobalVar("MediaSpawner_CurrentSpawnName", spawn.Name, persisted: false);
        CPH.SetGlobalVar("MediaSpawner_TriggerType", triggerType, persisted: false);

        // Set context data
        foreach (var kvp in contextData)
        {
          CPH.SetGlobalVar($"MediaSpawner_Context_{kvp.Key}", kvp.Value?.ToString() ?? "", persisted: false);
        }

        // Execute the spawn
        bool spawnResult = ExecuteSpawn(spawn, triggerType, contextData);
        if (!spawnResult)
        {
          allSuccessful = false;
        }
      }
      catch (Exception ex)
      {
        CPH.LogError($"ExecuteSpawns: Error executing spawn '{spawn.Name}': {ex.Message}");
        allSuccessful = false;
      }
    }

    return allSuccessful;
  }

  #endregion

  #region Spawn Execution Engine

  /// <summary>
  /// Execute a single spawn with asset selection, property resolution, and OBS coordination
  /// </summary>
  /// <param name="spawn">The spawn to execute</param>
  /// <param name="triggerType">The type of trigger that activated this spawn</param>
  /// <param name="contextData">Additional context data for the execution</param>
  /// <returns>True if spawn executed successfully</returns>
  private bool ExecuteSpawn(Spawn spawn, string triggerType, Dictionary<string, object> contextData)
  {
    try
    {
      CPH.LogInfo($"ExecuteSpawn: Starting execution of spawn '{spawn.Name}' (ID: {spawn.Id})");

      // Validate spawn is enabled
      if (!spawn.Enabled)
      {
        CPH.LogWarn($"ExecuteSpawn: Spawn '{spawn.Name}' is disabled, skipping execution");
        return false;
      }

      // Get enabled assets from the spawn
      List<SpawnAsset> enabledAssets = GetEnabledSpawnAssets(spawn);
      if (enabledAssets.Count == 0)
      {
        CPH.LogWarn($"ExecuteSpawn: No enabled assets found in spawn '{spawn.Name}'");
        return true; // Not an error, just no assets to process
      }

      // Process randomization buckets to select assets
      List<SpawnAsset> selectedAssets = ProcessRandomizationBuckets(spawn, enabledAssets);
      if (selectedAssets.Count == 0)
      {
        CPH.LogWarn($"ExecuteSpawn: No assets selected after randomization processing for spawn '{spawn.Name}'");
        return true; // Not an error, just no assets selected
      }

      CPH.LogInfo($"ExecuteSpawn: Selected {selectedAssets.Count} assets for execution");

      // Execute each selected asset
      bool allAssetsSuccessful = true;
      foreach (SpawnAsset spawnAsset in selectedAssets)
      {
        try
        {
          bool assetResult = ExecuteSpawnAsset(spawn, spawnAsset, triggerType, contextData);
          if (!assetResult)
          {
            allAssetsSuccessful = false;
          }
        }
        catch (Exception ex)
        {
          CPH.LogError($"ExecuteSpawn: Error executing asset '{spawnAsset.AssetId}': {ex.Message}");
          allAssetsSuccessful = false;
        }
      }

      // Handle spawn-level timing and cleanup
      if (spawn.Duration > 0)
      {
        CPH.LogInfo($"ExecuteSpawn: Spawn '{spawn.Name}' will run for {spawn.Duration}ms");
        // TODO: Implement timing management and cleanup
        // This would involve scheduling cleanup after the duration expires
      }

      CPH.LogInfo($"ExecuteSpawn: Completed execution of spawn '{spawn.Name}' - Success: {allAssetsSuccessful}");
      return allAssetsSuccessful;
    }
    catch (Exception ex)
    {
      CPH.LogError($"ExecuteSpawn: Unexpected error executing spawn '{spawn.Name}': {ex.Message}");
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
    if (spawn.Assets == null)
      return new List<SpawnAsset>();

    return spawn.Assets
      .Where(asset => asset.Enabled)
      .OrderBy(asset => asset.Order)
      .ToList();
  }

  /// <summary>
  /// Process randomization buckets to select assets for execution
  /// </summary>
  /// <param name="spawn">The spawn containing the buckets</param>
  /// <param name="enabledAssets">The enabled assets to select from</param>
  /// <returns>List of selected assets for execution</returns>
  private List<SpawnAsset> ProcessRandomizationBuckets(Spawn spawn, List<SpawnAsset> enabledAssets)
  {
    if (spawn.RandomizationBuckets == null || spawn.RandomizationBuckets.Count == 0)
    {
      // No randomization buckets, return all enabled assets
      return enabledAssets;
    }

    List<SpawnAsset> selectedAssets = new List<SpawnAsset>();
    HashSet<string> usedAssetIds = new HashSet<string>();

    foreach (RandomizationBucket bucket in spawn.RandomizationBuckets)
    {
      try
      {
        List<SpawnAsset> bucketAssets = GetBucketAssets(spawn, bucket, enabledAssets);
        if (bucketAssets.Count == 0)
          continue;

        List<SpawnAsset> selectedFromBucket = SelectAssetsFromBucket(bucket, bucketAssets, usedAssetIds);
        selectedAssets.AddRange(selectedFromBucket);

        // Mark selected assets as used
        foreach (SpawnAsset asset in selectedFromBucket)
        {
          usedAssetIds.Add(asset.Id);
        }
      }
      catch (Exception ex)
      {
        CPH.LogError($"ProcessRandomizationBuckets: Error processing bucket '{bucket.Name}': {ex.Message}");
      }
    }

    // Add any remaining enabled assets that weren't in buckets
    foreach (SpawnAsset asset in enabledAssets)
    {
      if (!usedAssetIds.Contains(asset.Id))
      {
        selectedAssets.Add(asset);
      }
    }

    return selectedAssets;
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
        CPH.LogWarn($"SelectAssetsFromBucket: Unknown selection type '{bucket.Selection}' for bucket '{bucket.Name}'");
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
  /// Execute a single spawn asset with property resolution and OBS coordination
  /// </summary>
  /// <param name="spawn">The parent spawn</param>
  /// <param name="spawnAsset">The spawn asset to execute</param>
  /// <param name="triggerType">The type of trigger that activated this spawn</param>
  /// <param name="contextData">Additional context data for the execution</param>
  /// <returns>True if asset executed successfully</returns>
  private bool ExecuteSpawnAsset(Spawn spawn, SpawnAsset spawnAsset, string triggerType, Dictionary<string, object> contextData)
  {
    try
    {
      CPH.LogInfo($"ExecuteSpawnAsset: Executing asset '{spawnAsset.AssetId}' in spawn '{spawn.Name}'");

      // Find the base asset
      MediaAsset baseAsset = _cachedConfig?.FindAssetById(spawnAsset.AssetId);
      if (baseAsset == null)
      {
        CPH.LogError($"ExecuteSpawnAsset: Base asset '{spawnAsset.AssetId}' not found in configuration");
        return false;
      }

      // Resolve effective properties
      EffectivePropertiesResult effectiveProperties = ResolveEffectiveProperties(spawn, spawnAsset);

      // Create OBS source for the asset
      bool sourceCreated = CreateOBSSource(baseAsset, effectiveProperties.Effective, spawnAsset.Id);
      if (!sourceCreated)
      {
        CPH.LogError($"ExecuteSpawnAsset: Failed to create OBS source for asset '{spawnAsset.AssetId}'");
        return false;
      }

      // Apply asset properties to OBS source
      bool propertiesApplied = ApplyAssetPropertiesToOBS(baseAsset, effectiveProperties.Effective, spawnAsset.Id);
      if (!propertiesApplied)
      {
        CPH.LogWarn($"ExecuteSpawnAsset: Failed to apply some properties to OBS source for asset '{spawnAsset.AssetId}'");
      }

      // Show the OBS source
      bool sourceShown = ShowOBSSource(spawnAsset.Id);
      if (!sourceShown)
      {
        CPH.LogError($"ExecuteSpawnAsset: Failed to show OBS source for asset '{spawnAsset.AssetId}'");
        return false;
      }

      // Handle asset-specific timing
      double assetDuration = GetAssetDuration(spawn, spawnAsset);
      if (assetDuration > 0)
      {
        CPH.LogInfo($"ExecuteSpawnAsset: Asset '{spawnAsset.AssetId}' will display for {assetDuration}ms");
        // TODO: Implement asset-specific timing and cleanup
      }

      CPH.LogInfo($"ExecuteSpawnAsset: Successfully executed asset '{spawnAsset.AssetId}'");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"ExecuteSpawnAsset: Error executing asset '{spawnAsset.AssetId}': {ex.Message}");
      return false;
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
      SourceMap = sourceMap
    };
  }

  /// <summary>
  /// Resolve a simple property with precedence rules
  /// </summary>
  private void ResolveProperty(string propertyName, Dictionary<string, object> overrides, Dictionary<string, object> spawnDefaults, Dictionary<string, object> effective, Dictionary<string, string> sourceMap)
  {
    if (overrides.ContainsKey(propertyName))
    {
      effective[propertyName] = overrides[propertyName];
      sourceMap[propertyName] = "override";
    }
    else if (spawnDefaults.ContainsKey(propertyName))
    {
      effective[propertyName] = spawnDefaults[propertyName];
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
    object overrideVal = overrides.ContainsKey(propertyName) ? overrides[propertyName] : null;
    object spawnVal = spawnDefaults.ContainsKey(propertyName) ? spawnDefaults[propertyName] : null;

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
  /// <returns>True if source was created successfully</returns>
  private bool CreateOBSSource(MediaAsset asset, Dictionary<string, object> properties, string sourceName)
  {
    try
    {
      CPH.LogInfo($"CreateOBSSource: Creating OBS source '{sourceName}' for asset '{asset.Name}' ({asset.Type})");

      // Validate OBS connection first
      if (!ValidateOBSConnection())
      {
        CPH.LogError("CreateOBSSource: OBS connection validation failed");
        return false;
      }

      // Check if source already exists
      if (OBSSourceExists(sourceName))
      {
        CPH.LogWarn($"CreateOBSSource: Source '{sourceName}' already exists, skipping creation");
        return true;
      }

      // Determine source type based on asset type
      string obsSourceType = GetOBSSourceType(asset.Type);
      if (string.IsNullOrEmpty(obsSourceType))
      {
        CPH.LogError($"CreateOBSSource: Unsupported asset type '{asset.Type}' for asset '{asset.Name}'");
        return false;
      }

      // Get current scene
      string currentScene = GetCurrentOBSScene();
      if (string.IsNullOrEmpty(currentScene))
      {
        CPH.LogError("CreateOBSSource: Could not determine current OBS scene");
        return false;
      }

      // Build source settings
      Dictionary<string, object> sourceSettings = BuildOBSSourceSettings(asset, properties);

      // Create OBS request for source creation
      Dictionary<string, object> createSourceRequest = new Dictionary<string, object>
      {
        ["requestType"] = "CreateSource",
        ["requestId"] = Guid.NewGuid().ToString(),
        ["requestData"] = new Dictionary<string, object>
        {
          ["sourceName"] = sourceName,
          ["sourceKind"] = obsSourceType,
          ["sceneName"] = currentScene,
          ["sourceSettings"] = sourceSettings
        }
      };

      // Send the request to OBS
      string response = CPH.ObsSendRaw("CreateSource", JsonConvert.SerializeObject(createSourceRequest));
      if (string.IsNullOrEmpty(response))
      {
        CPH.LogError($"CreateOBSSource: No response from OBS for source creation '{sourceName}'");
        return false;
      }

      // Parse response to check for success
      Dictionary<string, object> responseData = JsonConvert.DeserializeObject<Dictionary<string, object>>(response);
      if (responseData.ContainsKey("requestStatus") && responseData["requestStatus"] is Dictionary<string, object> status)
      {
        bool result = status.ContainsKey("result") && status["result"] is bool success && success;
        if (result)
        {
          CPH.LogInfo($"CreateOBSSource: Successfully created OBS source '{sourceName}'");
          return true;
        }
        else
        {
          string error = status.ContainsKey("comment") ? status["comment"].ToString() : "Unknown error";
          CPH.LogError($"CreateOBSSource: Failed to create OBS source '{sourceName}': {error}");
          return false;
        }
      }

      CPH.LogError($"CreateOBSSource: Invalid response format from OBS for source creation '{sourceName}'");
      return false;
    }
    catch (Exception ex)
    {
      CPH.LogError($"CreateOBSSource: Error creating OBS source '{sourceName}': {ex.Message}");
      return false;
    }
  }

  /// <summary>
  /// Apply asset properties to an OBS source
  /// </summary>
  /// <param name="asset">The media asset</param>
  /// <param name="properties">The effective properties to apply</param>
  /// <param name="sourceName">The name of the OBS source</param>
  /// <returns>True if properties were applied successfully</returns>
  private bool ApplyAssetPropertiesToOBS(MediaAsset asset, Dictionary<string, object> properties, string sourceName)
  {
    try
    {
      CPH.LogInfo($"ApplyAssetPropertiesToOBS: Applying properties to source '{sourceName}'");

      string currentScene = GetCurrentOBSScene();
      if (string.IsNullOrEmpty(currentScene))
      {
        CPH.LogError("ApplyAssetPropertiesToOBS: Could not determine current OBS scene");
        return false;
      }

      // Build batch requests for efficient property application
      List<Dictionary<string, object>> batchRequests = new List<Dictionary<string, object>>();

      // Apply volume
      if (properties.ContainsKey("volume") && properties["volume"] is double volume)
      {
        Dictionary<string, object> volumeRequest = new Dictionary<string, object>
        {
          ["requestType"] = "SetSourceVolume",
          ["requestId"] = Guid.NewGuid().ToString(),
          ["requestData"] = new Dictionary<string, object>
          {
            ["sourceName"] = sourceName,
            ["volume"] = volume
          }
        };
        batchRequests.Add(volumeRequest);
      }

      // Apply scale
      if (properties.ContainsKey("scale") && properties["scale"] is double scale)
      {
        Dictionary<string, object> scaleRequest = new Dictionary<string, object>
        {
          ["requestType"] = "SetSourceScale",
          ["requestId"] = Guid.NewGuid().ToString(),
          ["requestData"] = new Dictionary<string, object>
          {
            ["sourceName"] = sourceName,
            ["scaleX"] = scale,
            ["scaleY"] = scale
          }
        };
        batchRequests.Add(scaleRequest);
      }

      // Apply position
      if (properties.ContainsKey("position") && properties["position"] is Dictionary<string, object> position)
      {
        double x = position.ContainsKey("x") && position["x"] is double xVal ? xVal : 0;
        double y = position.ContainsKey("y") && position["y"] is double yVal ? yVal : 0;

        Dictionary<string, object> positionRequest = new Dictionary<string, object>
        {
          ["requestType"] = "SetSourcePosition",
          ["requestId"] = Guid.NewGuid().ToString(),
          ["requestData"] = new Dictionary<string, object>
          {
            ["sourceName"] = sourceName,
            ["x"] = x,
            ["y"] = y
          }
        };
        batchRequests.Add(positionRequest);
      }

      // Apply dimensions
      if (properties.ContainsKey("dimensions") && properties["dimensions"] is Dictionary<string, object> dimensions)
      {
        double width = dimensions.ContainsKey("width") && dimensions["width"] is double w ? w : 0;
        double height = dimensions.ContainsKey("height") && dimensions["height"] is double h ? h : 0;

        if (width > 0 && height > 0)
        {
          Dictionary<string, object> sizeRequest = new Dictionary<string, object>
          {
            ["requestType"] = "SetSourceSize",
            ["requestId"] = Guid.NewGuid().ToString(),
            ["requestData"] = new Dictionary<string, object>
            {
              ["sourceName"] = sourceName,
              ["width"] = width,
              ["height"] = height
            }
          };
          batchRequests.Add(sizeRequest);
        }
      }

      // Apply media-specific properties
      if (asset.Type == "video" || asset.Type == "audio")
      {
        // Apply loop setting
        if (properties.ContainsKey("loop") && properties["loop"] is bool loop)
        {
          Dictionary<string, object> loopRequest = new Dictionary<string, object>
          {
            ["requestType"] = "SetSourceSettings",
            ["requestId"] = Guid.NewGuid().ToString(),
            ["requestData"] = new Dictionary<string, object>
            {
              ["sourceName"] = sourceName,
              ["sourceSettings"] = new Dictionary<string, object>
              {
                ["looping"] = loop
              }
            }
          };
          batchRequests.Add(loopRequest);
        }

        // Apply muted setting
        if (properties.ContainsKey("muted") && properties["muted"] is bool muted)
        {
          Dictionary<string, object> mutedRequest = new Dictionary<string, object>
          {
            ["requestType"] = "SetSourceMuted",
            ["requestId"] = Guid.NewGuid().ToString(),
            ["requestData"] = new Dictionary<string, object>
            {
              ["sourceName"] = sourceName,
              ["muted"] = muted
            }
          };
          batchRequests.Add(mutedRequest);
        }
      }

      // Execute batch requests if any were created
      if (batchRequests.Count > 0)
      {
        string batchResponse = CPH.ObsSendBatchRaw(JsonConvert.SerializeObject(batchRequests));
        if (string.IsNullOrEmpty(batchResponse))
        {
          CPH.LogError($"ApplyAssetPropertiesToOBS: No response from OBS for property application to '{sourceName}'");
          return false;
        }

        // Parse batch response to check for success
        List<Dictionary<string, object>> responses = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(batchResponse);
        bool allSuccessful = true;

        foreach (Dictionary<string, object> response in responses)
        {
          if (response.ContainsKey("requestStatus") && response["requestStatus"] is Dictionary<string, object> status)
          {
            bool success = status.ContainsKey("result") && status["result"] is bool result && result;
            if (!success)
            {
              allSuccessful = false;
              string error = status.ContainsKey("comment") ? status["comment"].ToString() : "Unknown error";
              CPH.LogWarn($"ApplyAssetPropertiesToOBS: Property application failed for '{sourceName}': {error}");
            }
          }
        }

        CPH.LogInfo($"ApplyAssetPropertiesToOBS: Properties applied to source '{sourceName}' - Success: {allSuccessful}");
        return allSuccessful;
      }

      CPH.LogInfo($"ApplyAssetPropertiesToOBS: No properties to apply to source '{sourceName}'");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"ApplyAssetPropertiesToOBS: Error applying properties to source '{sourceName}': {ex.Message}");
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
    try
    {
      CPH.LogInfo($"ShowOBSSource: Showing OBS source '{sourceName}'");

      // Use built-in Streamer.bot method to show the source
      bool success = CPH.ObsShowSource(sourceName);

      if (success)
      {
        CPH.LogInfo($"ShowOBSSource: Successfully showed OBS source '{sourceName}'");
        return true;
      }
      else
      {
        CPH.LogError($"ShowOBSSource: Failed to show OBS source '{sourceName}'");
        return false;
      }
    }
    catch (Exception ex)
    {
      CPH.LogError($"ShowOBSSource: Error showing OBS source '{sourceName}': {ex.Message}");
      return false;
    }
  }

  /// <summary>
  /// Hide an OBS source
  /// </summary>
  /// <param name="sourceName">The name of the source to hide</param>
  /// <returns>True if source was hidden successfully</returns>
  private bool HideOBSSource(string sourceName)
  {
    try
    {
      CPH.LogInfo($"HideOBSSource: Hiding OBS source '{sourceName}'");

      // Use built-in Streamer.bot method to hide the source
      bool success = CPH.ObsHideSource(sourceName);

      if (success)
      {
        CPH.LogInfo($"HideOBSSource: Successfully hid OBS source '{sourceName}'");
        return true;
      }
      else
      {
        CPH.LogError($"HideOBSSource: Failed to hide OBS source '{sourceName}'");
        return false;
      }
    }
    catch (Exception ex)
    {
      CPH.LogError($"HideOBSSource: Error hiding OBS source '{sourceName}': {ex.Message}");
      return false;
    }
  }

  /// <summary>
  /// Delete an OBS source
  /// </summary>
  /// <param name="sourceName">The name of the source to delete</param>
  /// <returns>True if source was deleted successfully</returns>
  private bool DeleteOBSSource(string sourceName)
  {
    try
    {
      CPH.LogInfo($"DeleteOBSSource: Deleting OBS source '{sourceName}'");

      string currentScene = GetCurrentOBSScene();
      if (string.IsNullOrEmpty(currentScene))
      {
        CPH.LogError("DeleteOBSSource: Could not determine current OBS scene");
        return false;
      }

      // Create OBS request to delete the source
      Dictionary<string, object> deleteSourceRequest = new Dictionary<string, object>
      {
        ["requestType"] = "RemoveSceneItem",
        ["requestId"] = Guid.NewGuid().ToString(),
        ["requestData"] = new Dictionary<string, object>
        {
          ["sceneName"] = currentScene,
          ["item"] = sourceName
        }
      };

      // Send the request to OBS
      string response = CPH.ObsSendRaw("RemoveSceneItem", JsonConvert.SerializeObject(deleteSourceRequest));
      if (string.IsNullOrEmpty(response))
      {
        CPH.LogError($"DeleteOBSSource: No response from OBS for deleting source '{sourceName}'");
        return false;
      }

      // Parse response to check for success
      Dictionary<string, object> responseData = JsonConvert.DeserializeObject<Dictionary<string, object>>(response);
      if (responseData.ContainsKey("requestStatus") && responseData["requestStatus"] is Dictionary<string, object> status)
      {
        bool result = status.ContainsKey("result") && status["result"] is bool success && success;
        if (result)
        {
          CPH.LogInfo($"DeleteOBSSource: Successfully deleted OBS source '{sourceName}'");
          return true;
        }
        else
        {
          string error = status.ContainsKey("comment") ? status["comment"].ToString() : "Unknown error";
          CPH.LogError($"DeleteOBSSource: Failed to delete OBS source '{sourceName}': {error}");
          return false;
        }
      }

      CPH.LogError($"DeleteOBSSource: Invalid response format from OBS for deleting source '{sourceName}'");
      return false;
    }
    catch (Exception ex)
    {
      CPH.LogError($"DeleteOBSSource: Error deleting OBS source '{sourceName}': {ex.Message}");
      return false;
    }
  }

  /// <summary>
  /// Get the OBS source type for a media asset type
  /// </summary>
  /// <param name="assetType">The media asset type</param>
  /// <returns>The corresponding OBS source type</returns>
  private string GetOBSSourceType(string assetType)
  {
    switch (assetType?.ToLowerInvariant())
    {
      case "image":
        return "image_source";
      case "video":
        return "ffmpeg_source";
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

    // Set the file path or URL
    if (asset.IsUrl)
    {
      settings["url"] = asset.Path;
    }
    else
    {
      settings["local_file"] = asset.Path;
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
        CPH.LogWarn("GetCurrentOBSScene: No scene name returned from OBS");
        return "Default";
      }

      CPH.LogInfo($"GetCurrentOBSScene: Current scene is '{sceneName}'");
      return sceneName;
    }
    catch (Exception ex)
    {
      CPH.LogWarn($"GetCurrentOBSScene: Could not get current scene: {ex.Message}");
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
    try
    {
      CPH.LogInfo("ValidateOBSConnection: Checking OBS connection");

      // Use built-in Streamer.bot method to check OBS connection
      bool isConnected = CPH.ObsIsConnected();

      if (isConnected)
      {
        CPH.LogInfo("ValidateOBSConnection: OBS connection is valid and responsive");
        return true;
      }
      else
      {
        CPH.LogError("ValidateOBSConnection: OBS is not connected");
        return false;
      }
    }
    catch (Exception ex)
    {
      CPH.LogError($"ValidateOBSConnection: Error validating OBS connection: {ex.Message}");
      return false;
    }
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
        CPH.LogInfo("ExecuteOBSBatchOperations: No operations to execute");
        return true;
      }

      CPH.LogInfo($"ExecuteOBSBatchOperations: Executing {operations.Count} OBS operations in batch");

      // Send batch request to OBS
      string batchResponse = CPH.ObsSendBatchRaw(JsonConvert.SerializeObject(operations));
      if (string.IsNullOrEmpty(batchResponse))
      {
        CPH.LogError("ExecuteOBSBatchOperations: No response from OBS for batch operations");
        return false;
      }

      // Parse batch response to check for success
      List<Dictionary<string, object>> responses = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(batchResponse);
      bool allSuccessful = true;

      foreach (Dictionary<string, object> response in responses)
      {
        if (response.ContainsKey("requestStatus") && response["requestStatus"] is Dictionary<string, object> status)
        {
          bool success = status.ContainsKey("result") && status["result"] is bool result && result;
          if (!success)
          {
            allSuccessful = false;
            string error = status.ContainsKey("comment") ? status["comment"].ToString() : "Unknown error";
            CPH.LogWarn($"ExecuteOBSBatchOperations: Operation failed: {error}");
          }
        }
      }

      CPH.LogInfo($"ExecuteOBSBatchOperations: Batch operations completed - Success: {allSuccessful}");
      return allSuccessful;
    }
    catch (Exception ex)
    {
      CPH.LogError($"ExecuteOBSBatchOperations: Error executing batch operations: {ex.Message}");
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
        CPH.LogError("OBSSourceExists: Could not determine current OBS scene");
        return false;
      }

      // Create OBS request to get scene items
      Dictionary<string, object> getSceneItemsRequest = new Dictionary<string, object>
      {
        ["requestType"] = "GetSceneItemList",
        ["requestId"] = Guid.NewGuid().ToString(),
        ["requestData"] = new Dictionary<string, object>
        {
          ["sceneName"] = currentScene
        }
      };

      // Send the request to OBS
      string response = CPH.ObsSendRaw("GetSceneItemList", JsonConvert.SerializeObject(getSceneItemsRequest));
      if (string.IsNullOrEmpty(response))
      {
        CPH.LogError($"OBSSourceExists: No response from OBS for checking source '{sourceName}'");
        return false;
      }

      // Parse response to check for source existence
      Dictionary<string, object> responseData = JsonConvert.DeserializeObject<Dictionary<string, object>>(response);
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
                  CPH.LogInfo($"OBSSourceExists: Source '{sourceName}' exists in scene '{currentScene}'");
                  return true;
                }
              }
            }
          }
        }
      }

      CPH.LogInfo($"OBSSourceExists: Source '{sourceName}' does not exist in scene '{currentScene}'");
      return false;
    }
    catch (Exception ex)
    {
      CPH.LogError($"OBSSourceExists: Error checking if source '{sourceName}' exists: {ex.Message}");
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
      CPH.LogWarn("SetMediaSpawnerConfig: Missing required argument 'mediaSpawnerConfigValue'");
      return false;
    }

    try
    {
      CPH.SetGlobalVar(MediaSpawnerConfigVarName, mediaSpawnerConfigValue, persisted: true);

      CPH.SetGlobalVar(MediaSpawnerShaVarName, ComputeSha256(mediaSpawnerConfigValue), persisted: true);
      CPH.LogInfo($"SetMediaSpawnerConfig: Successfully set MediaSpawner config (persist: true)");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"SetMediaSpawnerConfig: Failed to set MediaSpawner config: {ex.Message}");
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

  // Cached configuration for performance
  private static MediaSpawnerConfig _cachedConfig;
  private static string _cachedConfigSha;

  /// <summary>
  /// Load MediaSpawner configuration from global variables
  /// </summary>
  /// <returns>True if configuration loaded successfully, false otherwise</returns>
  public bool LoadMediaSpawnerConfig()
  {
    try
    {
      string configJson = CPH.GetGlobalVar<string>(MediaSpawnerConfigVarName);
      if (string.IsNullOrWhiteSpace(configJson))
      {
        CPH.LogError("LoadMediaSpawnerConfig: No MediaSpawner configuration found in global variables");
        return false;
      }

      // Check if we need to reload (config might have changed)
      string currentSha = ComputeSha256(configJson);
      if (_cachedConfig != null && _cachedConfigSha == currentSha)
      {
        CPH.LogInfo("LoadMediaSpawnerConfig: Using cached configuration");
        return true;
      }

      // Deserialize configuration
      if (!MediaSpawnerConfig.TryDeserialize(configJson, out MediaSpawnerConfig config, out string error))
      {
        CPH.LogError($"LoadMediaSpawnerConfig: Failed to deserialize configuration: {error}");
        return false;
      }

      // Cache the configuration
      _cachedConfig = config;
      _cachedConfigSha = currentSha;

      CPH.LogInfo($"LoadMediaSpawnerConfig: Successfully loaded configuration with {config.Profiles.Count} profiles and {config.Assets.Count} assets");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"LoadMediaSpawnerConfig: Unexpected error: {ex.Message}");
      return false;
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
        CPH.LogError("GetSpawnProfile: Missing required argument 'profileId'");
        return false;
      }

      if (_cachedConfig == null)
      {
        CPH.LogError("GetSpawnProfile: No configuration loaded. Call LoadMediaSpawnerConfig first.");
        return false;
      }

      SpawnProfile profile = _cachedConfig.FindProfileById(profileId);
      if (profile == null)
      {
        CPH.LogError($"GetSpawnProfile: Profile with ID '{profileId}' not found");
        return false;
      }

      // Set profile data in global variables for use by other actions
      CPH.SetGlobalVar("MediaSpawner_CurrentProfile", JsonConvert.SerializeObject(profile), persisted: false);
      CPH.SetGlobalVar("MediaSpawner_CurrentProfileId", profile.Id, persisted: false);
      CPH.SetGlobalVar("MediaSpawner_CurrentProfileName", profile.Name, persisted: false);

      CPH.LogInfo($"GetSpawnProfile: Successfully loaded profile '{profile.Name}' with {profile.Spawns.Count} spawns");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"GetSpawnProfile: Unexpected error: {ex.Message}");
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
        CPH.LogError("GetAsset: Missing required argument 'assetId'");
        return false;
      }

      if (_cachedConfig == null)
      {
        CPH.LogError("GetAsset: No configuration loaded. Call LoadMediaSpawnerConfig first.");
        return false;
      }

      MediaAsset asset = _cachedConfig.FindAssetById(assetId);
      if (asset == null)
      {
        CPH.LogError($"GetAsset: Asset with ID '{assetId}' not found");
        return false;
      }

      // Set asset data in global variables for use by other actions
      CPH.SetGlobalVar("MediaSpawner_CurrentAsset", JsonConvert.SerializeObject(asset), persisted: false);
      CPH.SetGlobalVar("MediaSpawner_CurrentAssetId", asset.Id, persisted: false);
      CPH.SetGlobalVar("MediaSpawner_CurrentAssetName", asset.Name, persisted: false);
      CPH.SetGlobalVar("MediaSpawner_CurrentAssetType", asset.Type, persisted: false);
      CPH.SetGlobalVar("MediaSpawner_CurrentAssetPath", asset.Path, persisted: false);

      CPH.LogInfo($"GetAsset: Successfully loaded asset '{asset.Name}' ({asset.Type})");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"GetAsset: Unexpected error: {ex.Message}");
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
      if (_cachedConfig == null)
      {
        CPH.LogError("GetEnabledSpawns: No configuration loaded. Call LoadMediaSpawnerConfig first.");
        return false;
      }

      List<Spawn> enabledSpawns = _cachedConfig.GetEnabledSpawns();
      if (enabledSpawns.Count == 0)
      {
        CPH.LogWarn("GetEnabledSpawns: No enabled spawns found in configuration");
        CPH.SetGlobalVar("MediaSpawner_EnabledSpawns", "[]", persisted: false);
        CPH.SetGlobalVar("MediaSpawner_EnabledSpawnsCount", "0", persisted: false);
        return true;
      }

      // Set spawns data in global variables
      CPH.SetGlobalVar("MediaSpawner_EnabledSpawns", JsonConvert.SerializeObject(enabledSpawns), persisted: false);
      CPH.SetGlobalVar("MediaSpawner_EnabledSpawnsCount", enabledSpawns.Count.ToString(), persisted: false);

      CPH.LogInfo($"GetEnabledSpawns: Found {enabledSpawns.Count} enabled spawns");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"GetEnabledSpawns: Unexpected error: {ex.Message}");
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
      if (_cachedConfig == null)
      {
        CPH.LogError("ValidateConfig: No configuration loaded. Call LoadMediaSpawnerConfig first.");
        return false;
      }

      ValidationResult validationResult = _cachedConfig.Validate();

      if (validationResult.IsValid)
      {
        CPH.LogInfo("ValidateConfig: Configuration is valid");
        if (validationResult.Warnings.Count > 0)
        {
          CPH.LogWarn($"ValidateConfig: {validationResult.Warnings.Count} warnings found: {string.Join(", ", validationResult.Warnings)}");
        }

        return true;
      }
      else
      {
        CPH.LogError($"ValidateConfig: Configuration validation failed with {validationResult.Errors.Count} errors: {string.Join(", ", validationResult.Errors)}");
        return false;
      }
    }
    catch (Exception ex)
    {
      CPH.LogError($"ValidateConfig: Unexpected error: {ex.Message}");
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
        CPH.LogError("GetAssetsByType: Missing required argument 'assetType'");
        return false;
      }

      if (_cachedConfig == null)
      {
        CPH.LogError("GetAssetsByType: No configuration loaded. Call LoadMediaSpawnerConfig first.");
        return false;
      }

      List<MediaAsset> assets = _cachedConfig.GetAssetsByType(assetType);

      // Set assets data in global variables
      CPH.SetGlobalVar("MediaSpawner_FilteredAssets", JsonConvert.SerializeObject(assets), persisted: false);
      CPH.SetGlobalVar("MediaSpawner_FilteredAssetsCount", assets.Count.ToString(), persisted: false);
      CPH.SetGlobalVar("MediaSpawner_FilteredAssetsType", assetType, persisted: false);

      CPH.LogInfo($"GetAssetsByType: Found {assets.Count} assets of type '{assetType}'");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"GetAssetsByType: Unexpected error: {ex.Message}");
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
        CPH.LogError("GetSpawnById: Missing required argument 'profileId'");
        return false;
      }

      if (!CPH.TryGetArg("spawnId", out string spawnId) || string.IsNullOrWhiteSpace(spawnId))
      {
        CPH.LogError("GetSpawnById: Missing required argument 'spawnId'");
        return false;
      }

      if (_cachedConfig == null)
      {
        CPH.LogError("GetSpawnById: No configuration loaded. Call LoadMediaSpawnerConfig first.");
        return false;
      }

      SpawnProfile profile = _cachedConfig.FindProfileById(profileId);
      if (profile == null)
      {
        CPH.LogError($"GetSpawnById: Profile with ID '{profileId}' not found");
        return false;
      }

      Spawn spawn = profile.FindSpawnById(spawnId);
      if (spawn == null)
      {
        CPH.LogError($"GetSpawnById: Spawn with ID '{spawnId}' not found in profile '{profile.Name}'");
        return false;
      }

      // Set spawn data in global variables
      CPH.SetGlobalVar("MediaSpawner_CurrentSpawn", JsonConvert.SerializeObject(spawn), persisted: false);
      CPH.SetGlobalVar("MediaSpawner_CurrentSpawnId", spawn.Id, persisted: false);
      CPH.SetGlobalVar("MediaSpawner_CurrentSpawnName", spawn.Name, persisted: false);
      CPH.SetGlobalVar("MediaSpawner_CurrentSpawnEnabled", spawn.Enabled.ToString(), persisted: false);

      CPH.LogInfo($"GetSpawnById: Successfully loaded spawn '{spawn.Name}' from profile '{profile.Name}'");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"GetSpawnById: Unexpected error: {ex.Message}");
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
      _cachedConfig = null;
      _cachedConfigSha = null;
      CPH.LogInfo("ClearConfigCache: Configuration cache cleared");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"ClearConfigCache: Unexpected error: {ex.Message}");
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
}