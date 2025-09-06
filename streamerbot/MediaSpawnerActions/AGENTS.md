# Streamer.bot C# Actions — Implementation Guide (for AI Assistants)

This guide captures the essentials to author reliable Streamer.bot C# Actions, how they execute, how to pass/consume data, and how to structure code so it compiles and behaves correctly. Citations: [Guide: C# Code Actions](https://docs.streamer.bot/guide/csharp), [API: Execute C# Code](https://docs.streamer.bot/api/sub-actions/core/csharp/execute-csharp-code/), [API: Execute C# Method](https://docs.streamer.bot/api/sub-actions/core/csharp/execute-csharp-method).

## Core model

- **Execution unit**: an Execute C# Code sub-action containing a single public class `CPHInline` with a `bool Execute()` entrypoint. Returning `false` stops the current action (unless the result is captured to a variable). [Guide]
- **Runtime API**: the implicit `CPH` object exposes Streamer.bot methods and helpers; use it for logging, variables, sources, etc. [Guide]
- **Arguments**: available via a `Dictionary<string, object>` called `args`. Use `CPH.TryGetArg` to safely read values; do not index `args["key"]` without checking (throws when absent). [Guide]
- **Lifecycle**: optional `Init()` and `Dispose()` methods exist for one-time setup/cleanup when the code is compiled/teardown happens. [Guide]
- **Instance lifetime**: as of v0.2.3, the keep-alive behavior is enabled by default; private fields on `CPHInline` persist across calls. [Execute C# Code]

## Minimum required skeleton

```csharp
using System;

public class CPHInline
{
    public bool Execute()
    {
        // main logic here; return true to continue, false to stop
        return true;
    }
}
```

## Working with arguments and event metadata

- **Safe access (preferred)**:

```csharp
public class CPHInline
{
    public bool Execute()
    {
        if (CPH.TryGetArg("rawInput", out string rawInput))
        {
            CPH.LogInfo($"rawInput: {rawInput}");
        }

        // Special keys must use helpers
        var source = CPH.GetSource();   // corresponds to eventSource
        var eventType = CPH.GetEventType(); // corresponds to __source

        return true;
    }
}
```

- **Avoid** direct `args["name"]` without existence checks; it throws if missing. Prefer `TryGetArg`, `ContainsKey`, or `TryGetValue`. [Guide]

## Optional lifecycle hooks

```csharp
public void Init() { /* initialization at compile time */ }
public void Dispose() { /* cleanup at teardown */ }
```

Use these to allocate or release resources you intend to reuse across calls (e.g., cached clients). Persisted state lives in private fields because the instance stays alive. [Guide][Execute C# Code]

## Execute C# Code — configuration and tooling

- **Name/Description**: provide a Name to enable referencing its methods from Execute C# Method. [Execute C# Code]
- **Precompile on Application Start**: compile at startup for lower first-call latency; optionally enable Delayed Start if building UI. [Execute C# Code]
- **Save Result to Variable**: captures the `bool` result from `Execute()` into a variable; flow continues regardless of `false`. Without this, returning `false` stops the action. [Execute C# Code]
- **Views/Actions**:
  - Compiling Log: shows compiler output/errors. [Execute C# Code]
  - References: shows/edits assembly references; use Find Refs to auto-detect common ones. [Execute C# Code]
  - Format Document / Compile / Save and Compile / Ok / Cancel: standard authoring actions. [Execute C# Code]

## Execute C# Method — calling custom methods

- Lets you invoke any `bool` method with zero parameters defined in a named Execute C# Code sub-action, including `Execute()` itself. [Execute C# Method]
- **Signature requirement**:

```csharp
public bool MyStep()
{
    // work; return true to signal success/continue
    return true;
}
```

- **Run on UI Thread**: available toggle when the method requires UI-thread execution. [Execute C# Method]
- **Save Result to Variable**: captures the method’s `bool` result for subsequent logic. [Execute C# Method]
- Because the code instance is kept alive, private fields in `CPHInline` are preserved between calls; methods can share state. [Execute C# Method]

## Recommended patterns and rules

- **Always include the minimal class/entrypoint**: `public class CPHInline { public bool Execute() { ... } }`. [Guide]
- **Use `CPH.TryGetArg`** for inputs; log missing args and bail early with `false` when required inputs are absent. [Guide]
- **Avoid throwing for control flow**: use `bool` returns to steer action execution; only throw for truly exceptional conditions.
- **Capture results when needed**: enable Save Result to Variable if you need to continue the action but branch later based on success/failure. [Execute C# Code]
- **Statefulness**: prefer idempotent methods; if you keep state in private fields, document the assumptions and guard for re-entrancy. [Execute C# Code]
- **References**: if you use external types, ensure required references are present; use Find Refs, then add any missing ones manually. [Execute C# Code]
- **Logging**: use `CPH` logging utilities (e.g., `CPH.LogInfo`) to trace decisions and inputs, especially around argument handling and branch results. [Guide]
- **Threading**: only select Run on UI Thread when necessary; otherwise keep work off the UI thread to avoid blocking. [Execute C# Method]
- **Lifecycle hooks**: initialize expensive resources in `Init()` and dispose them in `Dispose()` when appropriate. [Guide]

## Example: composed action with reusable method

```csharp
using System;

public class CPHInline
{
    // Persisted fields (instance kept alive since v0.2.3)
    private int timesExecuted;

    public void Init()
    {
        timesExecuted = 0;
    }

    public bool Execute()
    {
        timesExecuted++;

        if (!CPH.TryGetArg("username", out string user) || string.IsNullOrWhiteSpace(user))
        {
            CPH.LogInfo("Missing or empty 'username' argument");
            return false; // stop unless Save Result to Variable is enabled
        }

        CPH.LogInfo($"Hello {user}! Executions so far: {timesExecuted}");
        return true;
    }

    // Can be called via Execute C# Method
    public bool Announce()
    {
        CPH.LogInfo("Announce called");
        return true;
    }

    public void Dispose()
    {
        // release any resources if needed
    }
}
```

## Quick checklist for implementation

- Define `CPHInline` with `bool Execute()`; return `true` on success, `false` to stop.
- Use `CPH.TryGetArg` for inputs; avoid direct `args["key"]` without checks.
- Use `CPH.GetSource()` and `CPH.GetEventType()` for special keys. [Guide]
- Add custom `bool` methods (no params) only if you need to call them from Execute C# Method. [Execute C# Method]
- If relying on state, store it in private fields; consider `Init()`/`Dispose()`.
- Configure Name (for Execute C# Method), Precompile on Start when useful, and Save Result to Variable when you need to continue regardless of success/failure. [Execute C# Code]
- Use Compile and Compiling Log to resolve errors; manage References as needed. [Execute C# Code]

## References

- Guide: C# Code Actions — `https://docs.streamer.bot/guide/csharp`
- API: Execute C# Code — `https://docs.streamer.bot/api/sub-actions/core/csharp/execute-csharp-code/`
- API: Execute C# Method — `https://docs.streamer.bot/api/sub-actions/core/csharp/execute-csharp-method`
