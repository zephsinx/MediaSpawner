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



  #endregion
}