using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

public class CPHInline
{
  private static readonly string MediaSpawnerConfigGuid = "59d16b77-5aa7-4336-9b18-eeb6af51a823";
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

    public MediaSpawnerConfig() { }

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

        var result = JsonConvert.DeserializeObject<MediaSpawnerConfig>(json);
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
      var result = new ValidationResult();

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
          var profileResult = Profiles[i].Validate();
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
          var assetResult = Assets[i].Validate();
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
      var enabledSpawns = new List<Spawn>();

      if (Profiles != null)
      {
        foreach (var profile in Profiles)
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

    public SpawnProfile() { }

    /// <summary>
    /// Validate the SpawnProfile data integrity
    /// </summary>
    /// <returns>Validation result with errors and warnings</returns>
    public ValidationResult Validate()
    {
      var result = new ValidationResult();

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
          var spawnResult = Spawns[i].Validate();
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

    public Spawn() { }

    /// <summary>
    /// Validate the Spawn data integrity
    /// </summary>
    /// <returns>Validation result with errors and warnings</returns>
    public ValidationResult Validate()
    {
      var result = new ValidationResult();

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
        var triggerResult = Trigger.Validate();
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
          var assetResult = Assets[i].Validate();
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
          var bucketResult = RandomizationBuckets[i].Validate();
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
      var members = new List<RandomizationBucketMember>();

      if (RandomizationBuckets != null)
      {
        foreach (var bucket in RandomizationBuckets)
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

    public SpawnAsset() { }

    /// <summary>
    /// Validate the SpawnAsset data integrity
    /// </summary>
    /// <returns>Validation result with errors and warnings</returns>
    public ValidationResult Validate()
    {
      var result = new ValidationResult();

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

    public SpawnAssetOverrides() { }
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

    public MediaAsset() { }

    /// <summary>
    /// Validate the MediaAsset data integrity
    /// </summary>
    /// <returns>Validation result with errors and warnings</returns>
    public ValidationResult Validate()
    {
      var result = new ValidationResult();

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

      var validTypes = new[] { "image", "video", "audio" };
      return validTypes.Contains(type.ToLowerInvariant());
    }

    /// <summary>
    /// Check if this asset is of a specific type
    /// </summary>
    /// <param name="type">The type to check</param>
    /// <returns>True if the asset is of the specified type</returns>
    public bool IsType(string type)
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

    public Trigger() { }

    /// <summary>
    /// Validate the Trigger data integrity
    /// </summary>
    /// <returns>Validation result with errors and warnings</returns>
    public ValidationResult Validate()
    {
      var result = new ValidationResult();

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

    public RandomizationBucket() { }

    /// <summary>
    /// Validate the RandomizationBucket data integrity
    /// </summary>
    /// <returns>Validation result with errors and warnings</returns>
    public ValidationResult Validate()
    {
      var result = new ValidationResult();

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

      var validTypes = new[] { "one", "n" };
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

    public RandomizationBucketMember() { }
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

    public AssetSettings() { }
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
        foreach (var warning in warnings)
        {
          AddWarning(warning);
        }
      }
    }

    public override string ToString()
    {
      var result = new List<string>();
      if (Errors.Count > 0)
        result.Add($"Errors: {string.Join(", ", Errors)}");
      if (Warnings.Count > 0)
        result.Add($"Warnings: {string.Join(", ", Warnings)}");
      return string.Join("; ", result);
    }
  }

  #endregion
}