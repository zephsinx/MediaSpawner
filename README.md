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

## Features

- **Spawn Management**: Create, configure, and organize spawns within profiles
- **Asset Library**: Central repository for all your media assets
- **Spawn-Specific Settings**: Configure how assets behave within each spawn
- **Profile Switching**: Work with different configurations for different scenarios
- **Export Ready**: Generate configurations for external applications

## Getting Started

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser to the local development URL

### Basic Workflow

1. **Create a Spawn Profile** - Start with a new profile or select an existing one
2. **Add Assets** - Import your media files into the asset library
3. **Create Spawns** - Group related assets together
4. **Configure Settings** - Set trigger conditions, duration, and asset-specific properties
5. **Export** - Generate configuration files for your target application

## Architecture

MediaSpawner uses a three-panel layout designed for efficient workflow:

- **Left Panel**: Spawn list with quick navigation and overview
- **Center Panel**: Configuration workspace for spawn and asset settings
- **Right Panel**: Asset management with library and spawn assignment

## Technology Stack

- React 19 + TypeScript
- Tailwind CSS for styling
- Vite for build tooling
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
- `npm run test` - Run test suite

## Author

- **zephsinx** - [GitHub](https://github.com/zephsinx) - <zephsinx@gmail.com>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
