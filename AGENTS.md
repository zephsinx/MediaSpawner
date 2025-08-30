# MediaSpawner — AGENTS.md

This file guides coding agents working on MediaSpawner. It complements README.md with concrete commands, conventions, and expectations that agents can execute verbatim.

## Project overview

- React 19 + TypeScript, Vite build, Tailwind CSS.
- App state persisted in browser localStorage.
- Planning docs live in `planning/`.

## Setup and common commands

- Install deps: `npm install`
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Preview production build: `npm run preview`
- Lint all files: `npm run lint`

## Testing instructions

- Test runner: Vitest with JSDOM environment and Testing Library.
- Global setup: `src/test-setup.ts` adds `@testing-library/jest-dom` matchers.
- Run full suite: `npm run test`
- Watch mode: `npm run test:watch`
- UI mode: `npm run test:ui`
- Coverage: `npm run test:coverage` (reports: text, html, json, lcov)
- Focus one test by name: `npm run test -- -t "<name>"`
- Run a single file: `npm run test -- src/path/to/File.test.tsx`
- Conventions:
  - One test file per source file when practical.
  - Reset mocks between tests so they do not affect each other (use `beforeEach` with `vi.resetAllMocks()` or equivalent).
  - Keep the entire suite green before merging; add/update tests for changed behavior.

## Code style and quality

- TypeScript strict mode is enabled (see `tsconfig.app.json` and `tsconfig.node.json`).
- ESLint configs: JS recommended + TypeScript recommended, React Hooks plugin, React Refresh rule.
- Avoid the `any` type; prefer precise types.
- Favor readable names and guard clauses over deep nesting.
- Delete unused or replaced code; do not leave legacy code commented out.
- Write comments only to explain non-obvious "why" decisions, not "what" the code does.

## Directory structure hints

- `src/components/` UI components (some tests under `__tests__/`).
- `src/services/` app logic; `src/utils/` helpers; `src/types/` shared types.
- `planning/` contains epics/stories and project documentation.

## PR and commit guidelines

- Before committing, run: `npm run lint` and `npm run test`.
- Update or add tests for any code you change.
- Keep commits focused and descriptive; prefer conventional messages if possible.

## Environment and tooling notes

- Vite base path auto-configures for GitHub Pages when `GITHUB_REPOSITORY` is present (see `vite.config.ts`). No manual action needed for local dev.

## Expectations for agents

- Use the commands above to verify changes locally. Keep tests and lint clean before finishing tasks.
- Implement only explicitly requested features or fixes; suggestions are welcome but should not be auto-implemented.
