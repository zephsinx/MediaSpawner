using System;
using System.Collections.Generic;

/// <summary>
/// Stub implementation of the CPH object for development and IDE support.
/// This class provides the same interface as Streamer.bot's runtime CPH object
/// but with no-op implementations for development purposes.
/// </summary>
public static class CPH
{
    /// <summary>
    /// Attempts to get an argument value by key with type conversion.
    /// </summary>
    /// <typeparam name="T">The expected type of the argument value</typeparam>
    /// <param name="key">The argument key</param>
    /// <param name="value">The output value if found</param>
    /// <returns>True if the argument was found and converted successfully</returns>
    public static bool TryGetArg<T>(string key, out T value)
    {
        value = default;
        return false;
    }

    /// <summary>
    /// Logs an informational message.
    /// </summary>
    /// <param name="message">The message to log</param>
    public static void LogInfo(string message)
    {
        // No-op for development
    }

    /// <summary>
    /// Logs a warning message.
    /// </summary>
    /// <param name="message">The warning message to log</param>
    public static void LogWarn(string message)
    {
        // No-op for development
    }

    /// <summary>
    /// Logs an error message.
    /// </summary>
    /// <param name="message">The error message to log</param>
    public static void LogError(string message)
    {
        // No-op for development
    }

    /// <summary>
    /// Sets a global variable with optional persistence.
    /// </summary>
    /// <param name="varName">The name of the global variable</param>
    /// <param name="value">The value to set</param>
    /// <param name="persisted">Whether the variable should persist across restarts</param>
    public static void SetGlobalVar(string varName, object value, bool persisted = true)
    {
        // No-op for development
    }

    /// <summary>
    /// Gets the current source/event source.
    /// </summary>
    /// <returns>The source identifier</returns>
    public static string GetSource()
    {
        return "";
    }

    /// <summary>
    /// Gets the current event type.
    /// </summary>
    /// <returns>The event type identifier</returns>
    public static string GetEventType()
    {
        return "";
    }

    /// <summary>
    /// Gets a global variable value.
    /// </summary>
    /// <param name="varName">The name of the global variable</param>
    /// <returns>The variable value or null if not found</returns>
    public static T GetGlobalVar<T>(string varName)
    {
        _ = varName;
        return default;
    }

    /// <summary>
    /// Sends a message to a specific source.
    /// </summary>
    /// <param name="message">The message to send</param>
    /// <param name="source">The target source</param>
    public static void SendMessage(string message, string source = "")
    {
        // No-op for development
    }

    /// <summary>
    /// Executes a sub-action by name.
    /// </summary>
    /// <param name="actionName">The name of the action to execute</param>
    /// <returns>True if the action executed successfully</returns>
    public static bool ExecuteAction(string actionName)
    {
        return true;
    }

    /// <summary>
    /// Waits for a specified number of milliseconds.
    /// </summary>
    /// <param name="milliseconds">The number of milliseconds to wait</param>
    public static void Wait(int milliseconds)
    {
        // No-op for development
    }
}
