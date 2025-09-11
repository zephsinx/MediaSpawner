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

  public bool Execute()
  {
    return true;
  }

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