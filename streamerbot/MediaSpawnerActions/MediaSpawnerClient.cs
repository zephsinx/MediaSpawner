using System;
using System.Collections.Generic;
using System.Globalization;
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

  #endregion
}