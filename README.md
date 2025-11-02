# MediaSpawner

A web application for creating and managing media asset configurations for streaming and presentation applications.

## Overview

MediaSpawner helps you organize media assets (images, videos, audio) into reusable configurations that can be exported for use in other applications like Streamer.bot. The application organizes assets into "Spawns" - groups of related media that can be triggered together.

## Key Concepts

### Spawn Profiles

Organizational containers that hold multiple spawns. You work with one profile at a time.

### Spawns

Sets of media assets that spawn together. Each spawn has its own trigger conditions, duration, and asset-specific settings.

### Assets

Individual media files (images, videos, audio) that can be assigned to spawns with specific configuration overrides.

### Triggers

Spawns can be activated by various events configured per-spawn:

- **Manual**: Activate on demand
- **Time-based**: Daily schedules, specific times, intervals, or recurring patterns
- **Streamer.bot Commands**: Respond to chat commands
- **Twitch Events**: Follows, cheers, subscriptions, channel point rewards, and more

### Randomization Buckets (per-spawn)

Configure subsets of a spawn's assets to be chosen at runtime by the consuming application.

- Buckets reference spawn assets (not library assets) and live on the spawn.
- Selection modes:
  - Pick one: exactly one member will be chosen.
  - Pick N: choose N unique members; N must be ≤ enabled members.
- Non-bucket assets always spawn as usual.
- UI: create buckets, edit members, and see bucket chips next to assets in the current spawn panel.

### Random Coordinates

Visual assets (images and videos) can generate random positions each time they spawn:

- Enable per-asset in the asset settings
- Configure canvas size in Settings to define boundaries (default: 1920x1080)
- Set asset dimensions to keep assets fully on-screen
- Uses absolute positioning mode automatically

## Features

- **Spawn Management**: Create, configure, and organize spawns within profiles
- **Asset Library**: Central repository for all your media assets
- **Spawn-Specific Settings**: Configure how assets behave within each spawn
- **Trigger Configuration**: Set up when spawns should activate (manual, time-based, commands, events)
- **Randomization Buckets**: Define groups that select one or N assets at runtime
- **Random Coordinates**: Generate random positions for visual assets within canvas bounds
- **Profile Switching**: Work with different configurations for different scenarios
- **Streamer.bot Integration**: Real-time connection and sync with Streamer.bot
- **Theme Support**: Light and dark mode
- **Import/Export**: Backup and share configurations as JSON files

## Getting Started

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser to the local development URL

### Streamer.bot Setup

- Import `MediaSpawnerClient.sb` into Streamer.bot (Actions > Import).
- This creates the C# Actions and queue that MediaSpawner uses to manage Spawns and interact with OBS.
- MediaSpawner connects to Streamer.bot via WebSocket for real-time sync and live profile management.
- For technical details, see: [C# Code Actions](https://docs.streamer.bot/guide/csharp) and [OBS Studio integration](https://docs.streamer.bot/guide/broadcasters/obs-studio).

### Settings

Configure the application through the Settings page:

- **Working Directory**: Local path for asset files (Windows or Unix format)
- **OBS Canvas Size**: Canvas dimensions for random coordinate bounds (default: 1920x1080)
- **Theme**: Choose light or dark mode
- **Import/Export**: Backup or share your entire configuration as JSON

### Basic Workflow

1. **Create a Spawn Profile** - Start with a new profile or select an existing one
2. **Add Assets** - Import your media files into the asset library
3. **Create Spawns** - Group related assets together
4. **Configure Settings** - Set trigger conditions, duration, and asset-specific properties
5. **Randomize** - Optionally create randomization buckets inside a spawn
6. **Export** - Generate configuration files for your target application

## Architecture

MediaSpawner uses a three-panel layout designed for efficient workflow:

- **Left Panel**: Spawn list with quick navigation and overview
- **Center Panel**: Configuration workspace for spawn and asset settings
- **Right Panel**: Asset management with library and spawn assignment

## Technology Stack

- React 19 + TypeScript
- Tailwind CSS for styling
- Radix UI for accessible component primitives
- Vite for build tooling
- Vitest for testing
- Moment Timezone for scheduling
- Lucide React for icons
- Sonner for notifications
- Browser localStorage for configuration persistence

## Development

### Project Structure

```markdown
mediaspawner/
├── src/
│ ├── components/ # React components
│ ├── services/ # Business logic and data management
│ ├── types/ # TypeScript type definitions
│ └── utils/ # Utility functions
├── planning/ # Project documentation and user stories
└── README.md
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code
- `npm run test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report

## Author

- **zephsinx** - [GitHub](https://github.com/zephsinx) - <zephsinx@gmail.com>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
