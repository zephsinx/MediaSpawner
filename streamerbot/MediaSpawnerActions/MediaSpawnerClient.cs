using System;

public class CPHInline
{
  public bool Execute()
  {
    return true;
  }

  public bool SetGlobalVariable()
  {
    // Read required arguments
    if (!CPH.TryGetArg("variableName", out string variableName) || string.IsNullOrWhiteSpace(variableName))
    {
      CPH.LogWarn("SetGlobalVariable: Missing required argument 'variableName'");
      return false;
    }

    if (!CPH.TryGetArg("variableValue", out string variableValue))
    {
      CPH.LogWarn("SetGlobalVariable: Missing required argument 'variableValue'");
      return false;
    }

    if (!CPH.TryGetArg("shouldPersist", out bool shouldPersist))
    {
      shouldPersist = true;
    }

    try
    {
      // Set the global variable
      CPH.SetGlobalVar(variableName, variableValue, shouldPersist);
      CPH.LogInfo($"SetGlobalVariable: Successfully set global variable '{variableName}' = '{variableValue}' (persist: {shouldPersist})");
      return true;
    }
    catch (Exception ex)
    {
      CPH.LogError($"SetGlobalVariable: Failed to set global variable '{variableName}': {ex.Message}");
      return false;
    }
  }
}