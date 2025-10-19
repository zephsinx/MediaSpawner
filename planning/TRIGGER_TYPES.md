# MS-50: Trigger Types — Taxonomy and Schema

## Purpose

Define an extensible, configuration-only trigger model for Spawns. Triggers describe when external events (time-based, Streamer.bot, Twitch) should activate a Spawn. No runtime integrations or simulations are included in scope.

## Design Principles

- Discriminated union by `type` with a per-type `config` object
- Minimal, user-configurable fields only (no full event payloads)
- Extensible without breaking existing saved data
- Timezone-aware scheduling; DST behavior must be predictable
- Streamer.bot alignment for future fetch/export

## Trigger Types

### Manual

- **Type**: `manual`
- **Config**: `{}`
- Rationale: Explicit, user-initiated activation path

### Time-based

- All time-based configs require a `timezone` (IANA tz name) for clarity and DST handling

1. At specific date/time
   - **Type**: `time.atDateTime`
   - **Config**: `{ isoDateTime: string (RFC3339), timezone: string }`

2. Daily at time
   - **Type**: `time.dailyAt`
   - **Config**: `{ time: string (HH:mm 24h), timezone: string }`

3. Every N minutes (with anchor)
   - **Type**: `time.everyNMinutes`
   - **Config**:
     - `intervalMinutes: number` (>= 1)
     - `timezone: string`
     - `anchor?`: `{ kind: 'topOfHour' } | { kind: 'custom', isoDateTime: string, timezone: string }`
     - Default anchor: `{ kind: 'topOfHour' }`

4. Minute of hour
   - **Type**: `time.minuteOfHour`
   - **Config**: `{ minute: number (0..59), timezone: string }`

### Streamer.bot Command

- **Type**: `streamerbot.command`
- **Config**: Stand-in shape aligned with Streamer.bot command metadata
  - `commandId?: string`
  - `aliases?: string[]` (temporary stand-in until fetch; min 1)
  - `caseSensitive?: boolean` (default false)
  - `sources?: string[]`
  - `ignoreInternal?: boolean` (default true)
  - `ignoreBotAccount?: boolean` (default true)
- See local context notes in `notepad: streamerbot-commands`

### Twitch Events

- Align names/fields with Streamer.bot Twitch events for forward compatibility.
- Reference: Streamer.bot client types [`twitch.types.ts`](https://github.com/Streamerbot/client/blob/main/packages/client/src/ws/types/events/twitch.types.ts)

1. Follow
   - **Type**: `twitch.follow`
   - **Config**: `{}`

2. Cheer
   - **Type**: `twitch.cheer`
   - **Config**: `{ minBits: number (>= 1) }`

3. Subscription
   - **Type**: `twitch.subscription`
   - **Config**: `{ tier?: '1000' | '2000' | '3000', minMonths?: number (>= 1) }`

4. Gifted Subs (separate from subscriptions)
   - **Type**: `twitch.giftSub`
   - **Config**: `{ minCount?: number (>= 1), tier?: '1000' | '2000' | '3000' }`

5. Channel Point Reward
   - **Type**: `twitch.channelPointReward`
   - **Config**: `{ rewardId?: string, rewardName?: string, minCost?: number (>= 0), userInput?: 'required' | 'optional' | 'none' }`

## Validation Rules (summary)

- `isoDateTime`: RFC3339 `date-time`
- `time`: `HH:mm` 24-hour format
- `minute`: integer in [0, 59]
- `intervalMinutes`: integer >= 1
- `timezone`: non-empty IANA timezone string
- `minBits`, `minMonths`, `minCount`, `minCost`: integers with specified minimums
- `tier`: one of `1000`, `2000`, `3000`
- Command aliases: non-empty strings; array min length = 1 (when provided)

## DST & Timezone Notes

- All schedules use provided `timezone` for interpretation
- For `dailyAt` and `minuteOfHour`, local-time execution follows timezone rules during DST shifts
- For `everyNMinutes` with `topOfHour` anchor, intervals are computed from each local hour boundary in the given timezone

## Streamer.bot Alignment

- Command trigger mirrors Streamer.bot command metadata; future implementation will fetch commands and validate `commandId`
- Twitch event trigger names/fields are designed to map cleanly onto Streamer.bot events without persisting raw payloads

## Future Extensions (Plan)

- Platform namespaces: keep `type` namespaced (e.g., `twitch.*`, `youtube.*`, `kick.*`, `streamerbot.*`) for clean expansion
- Additional Twitch events: `twitch.raid`, `twitch.hypeTrain`, `twitch.banTimeout` with minimal, user-facing constraint fields
- Other platforms: YouTube (`superChat`, `memberJoin`), Kick (subs, gifts) following the same minimal-config pattern
- Composite triggers (later): a `composite` type with `{ operator: 'any'|'all', children: Trigger[] }` for AND/OR compositions
- Time windows (later): optional `{ activeWindow: { daysOfWeek?: number[], start?: 'HH:mm', end?: 'HH:mm', timezone } }` gate applicable to any trigger
- Schema evolution: additive-only changes for backward compatibility; new trigger objects appended to the `oneOf` union; deprecations announced before removal

## Out of Scope (MS-50)

- Spawn-level cooldowns (may be added later)
- Complex compositions/boolean combinations of triggers
- Runtime event handling

## Examples

```json
{ "type": "manual", "config": {} }
```

```json
{
  "type": "time.dailyAt",
  "config": { "time": "09:30", "timezone": "America/Los_Angeles" }
}
```

```json
{
  "type": "time.everyNMinutes",
  "config": {
    "intervalMinutes": 15,
    "timezone": "UTC",
    "anchor": { "kind": "topOfHour" }
  }
}
```

```json
{ "type": "streamerbot.command", "config": { "commandId": "cmd_123" } }
```

```json
{
  "type": "twitch.channelPointReward",
  "config": { "rewardId": "abcd-1234", "userInput": "optional" }
}
```
