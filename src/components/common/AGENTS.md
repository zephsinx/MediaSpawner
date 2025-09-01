# Common Components — AGENTS.md

## Scope and purpose

- Shared UI primitives (e.g., dialogs, inputs, previews) with consistent accessibility.

## Accessibility

- Prefer visible text for accessible names.
- Link helper/error text via `aria-describedby`.
- Ensure modal and confirm dialogs are focus-trapped and have clear labels.

## Testing guidance

- Use Testing Library queries by role/name.
- Verify dialogs announce proper labels and descriptions.
