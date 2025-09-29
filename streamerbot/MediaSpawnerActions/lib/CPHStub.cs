using System;
using System.Collections.Generic;

/// <summary>
/// Event source enumeration for Streamer.bot
/// </summary>
public enum EventSource
{
    None,
    Twitch,
    YouTube,
    Mixer,
    Trovo,
    Glimesh,
    Kick,
    Generic
}

/// <summary>
/// Event type enumeration for Streamer.bot
/// </summary>
public enum EventType
{
    None,
    Command,
    Follow,
    Subscribe,
    Bits,
    Host,
    Raid,
    ChannelPoint,
    Generic
}

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
    /// Logs a verbose message.
    /// </summary>
    /// <param name="message">The message to log</param>
    public static void LogVerbose(string message)
    {
        // No-op for development
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
    /// <returns>The source identifier as EventSource enum</returns>
    public static EventSource GetSource()
    {
        return EventSource.None;
    }

    /// <summary>
    /// Gets the current event type.
    /// </summary>
    /// <returns>The event type identifier as EventType enum</returns>
    public static EventType GetEventType()
    {
        return EventType.None;
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

    /// <summary>
    /// Sends a raw request to OBS Studio via WebSocket.
    /// </summary>
    /// <param name="requestType">The type of OBS request to send</param>
    /// <param name="data">The JSON data for the request</param>
    /// <param name="connection">The OBS connection index (default: 0)</param>
    /// <returns>The response from OBS as a JSON string</returns>
    public static string ObsSendRaw(string requestType, string data, int connection = 0)
    {
        // No-op for development - return empty response
        return "{}";
    }

    /// <summary>
    /// Sends a batch of raw requests to OBS Studio via WebSocket.
    /// </summary>
    /// <param name="data">The JSON array of OBS requests to send</param>
    /// <param name="haltOnFailure">Whether to stop processing if any request fails (default: false)</param>
    /// <param name="executionType">The execution type for the batch (default: 0)</param>
    /// <param name="connection">The OBS connection index (default: 0)</param>
    /// <returns>The response from OBS as a JSON array string</returns>
    public static string ObsSendBatchRaw(string data, bool haltOnFailure = false, int executionType = 0, int connection = 0)
    {
        // No-op for development - return empty response array
        return "[]";
    }

    /// <summary>
    /// Gets the current scene name from OBS Studio.
    /// </summary>
    /// <param name="connection">The OBS connection index (default: 0)</param>
    /// <returns>The current scene name</returns>
    public static string ObsGetCurrentScene(int connection = 0)
    {
        // No-op for development - return default scene
        return "Default";
    }

    /// <summary>
    /// Shows a source in OBS Studio.
    /// </summary>
    /// <param name="sceneName">The name of the scene containing the source</param>
    /// <param name="sourceName">The name of the source to show</param>
    public static void ObsShowSource(string sceneName, string sourceName)
    {
        // No-op for development
    }

    /// <summary>
    /// Hides a source in OBS Studio.
    /// </summary>
    /// <param name="sceneName">The name of the scene containing the source</param>
    /// <param name="sourceName">The name of the source to hide</param>
    public static void ObsHideSource(string sceneName, string sourceName)
    {
        // No-op for development
    }

    /// <summary>
    /// Checks if OBS Studio is connected.
    /// </summary>
    /// <param name="connection">The OBS connection index (default: 0)</param>
    /// <returns>True if OBS is connected</returns>
    public static bool ObsIsConnected(int connection = 0)
    {
        // No-op for development - return connected
        return true;
    }
}
