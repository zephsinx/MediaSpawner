# MediaSpawner UI Style Guide

This guide defines visual and interaction standards for a lightweight, minimal, and accessible UI. It aligns with React 19, Vite, and Tailwind CSS, using headless primitives plus a small variants layer. Dark mode is planned and tokenized via CSS variables.

## Principles

- **Minimal**: low ornamentation, clear hierarchy, restrained color.
- **Lightweight**: headless components + Tailwind utilities; avoid heavy design systems.
- **Accessible**: keyboard-first, screen-reader friendly, WCAG AA contrast.
- **Consistent**: shared tokens, variants, and interaction patterns.

## Technology choices

- **Styling**: Tailwind CSS (utilities-first).
- **Headless primitives**: Radix UI (`@radix-ui/react-*`) for Dialog, Popover, Tooltip, DropdownMenu, Switch, Slider.
- **Seeded components**: selectively copy `shadcn/ui` (Button, Input, Dialog, DropdownMenu, Tooltip). Customize in-repo.
- **Toasts**: `sonner` (used by shadcn/ui recipes) for successes/errors.
- **Variants**: `tailwind-variants` (or `class-variance-authority` + `tailwind-merge`) to keep class sets maintainable.
- **Animations**: `tailwindcss-animate` for common keyframes.
- **Icons**: `lucide-react`.
- **Tailwind plugins**: `@tailwindcss/forms`, `@tailwindcss/typography`.

## Radix usage (Tooltip, DropdownMenu, Popover)

- Wrap the app once with `Tooltip.Provider` (`delayDuration≈300`, `skipDelayDuration≈100`).
- Surfaces: `rounded-md border border-gray-200 bg-white shadow-md`; content usually `p-1` (menus) or `p-2` (popovers).
- Items (DropdownMenu): `px-3 py-2 text-sm rounded` and state styles via Radix data attrs:
  - `data-[highlighted]:bg-gray-50`
  - `data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed`
- Arrows: `<Component.Arrow className="fill-white" />` to match white surfaces.
- Truncation tips: wrap truncated text in `Tooltip.Trigger asChild`; keep tooltip content small (`text-xs`).
- Focus: ensure triggers are focusable and use `focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2`.

## Toasts (sonner)

- Mount `<Toaster />` once at the app shell (e.g., `App.tsx`).
- Position `top-right`, `richColors` enabled. Keep messages short.
- Use `toast.success|error|info` for immediate feedback on actions.

## Color system

- **Accent**: Indigo (primary brand accent)
  - Default: `indigo-600`
  - Hover/active: `indigo-700`
  - Focus ring: `indigo-500`
- **Neutral**: Gray scale for surfaces, borders, and text
  - Text primary: `gray-900` (light), `gray-100` (dark)
  - Text secondary: `gray-600` (light), `gray-300` (dark)
  - Borders: `gray-200/300` (light), `gray-700/800` (dark)
- **Semantic**
  - Success: Emerald (`emerald-600/700`)
  - Warning: Amber (`amber-600/700`)
  - Error: Red (`red-600/700`)

## Theming and dark mode

- Strategy: Tailwind `dark` class on `<html>` or `<body>`.
- Tokenization: define CSS variables for core colors; override under `.dark`.

Example tokens (reference):

```css
:root {
  --color-accent: 99 102 241; /* indigo-500 */
  --color-accent-foreground: 255 255 255;
  --color-ring: 99 102 241; /* indigo-500 */
  --color-bg: 255 255 255; /* white */
  --color-fg: 17 24 39; /* gray-900 */
  --color-muted: 107 114 128; /* gray-500 */
  --color-border: 229 231 235; /* gray-200 */
  --radius: 0.375rem; /* rounded-md */
}
.dark {
  --color-accent: 99 102 241; /* indigo-500 */
  --color-accent-foreground: 255 255 255;
  --color-ring: 99 102 241;
  --color-bg: 17 24 39; /* gray-900 */
  --color-fg: 243 244 246; /* gray-100 */
  --color-muted: 209 213 219; /* gray-300 */
  --color-border: 55 65 81; /* gray-700 */
}
/* Usage with Tailwind's arbitrary values: bg-[rgb(var(--color-bg))] */
```

## Typography

- Font size: Tailwind defaults; body at `text-sm` to `text-base` depending on density.
- Line-height: default; prefer readable density in long text.
- Weights: regular (400), medium (500) for labels, semibold (600) for titles.

## Spacing, radii, borders, shadows

- **Spacing scale**: Tailwind defaults; lists and forms favor compact spacing.
- **Radii**: controls `rounded-md`; cards/dialogs `rounded-lg`.
- **Borders**: `border`, light mode `border-gray-200/300`, dark `border-gray-700`.
- **Shadows**: restrained—buttons none or `shadow-sm` on press; cards/dialogs `shadow-md`.

## Focus and interaction

- Always use `focus-visible` with a visible ring.
- Standard: `focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2`
- Disabled: reduce opacity and set `cursor-not-allowed`; maintain contrast for text.

## Motion

- Durations: 150–200ms, ease-out for entrances, ease-in for exits.
- Dialog/menu/tooltip transitions: subtle fade/scale using `tailwindcss-animate` keyframes.

## Component guidelines

Button

- Variants: primary (indigo), secondary (gray), outline, ghost, destructive (red).
- Sizes: sm (h-8 px-3), md (h-9 px-4), lg (h-10 px-5).
- States: hover (slightly darker), focus (ring), active (pressed), loading (spinner), disabled (opacity/locked cursor).
- Icon buttons: 8px gap between icon and label; square sizes for icon-only.

Input/Textarea/Select

- Base: `px-3 py-2 border rounded-md` with subtle shadow on focus.
- Focus: `ring-2 ring-[rgb(var(--color-ring))] ring-offset-2` and `border-indigo-500`.
- Error: `border-red-500` + help text in `text-red-600`.
- Placeholder: `text-gray-400` (light), `text-gray-500` (dark).

Dialog (Radix)

- Overlay: semi-transparent backdrop; blur optional.
- Content: centered, `rounded-lg`, `border`, `shadow-md`, max-w (sm/md/lg) with responsive padding.
- Close affordances: ESC, overlay click (optional), close button.
- Animation: fade/scale 95% -> 100%.

DropdownMenu (Radix)

- Surface: `rounded-md`, `border`, subtle shadow; items with `hover:bg-gray-50` (light) / `hover:bg-gray-800` (dark).
- Active/checked items show left indicator with adequate contrast.

Tooltip (Radix)

- Short delay (~300ms), placement aware; high contrast text on neutral background.

Toast (Sonner)

- Position top-right; success uses Emerald, error uses Red, neutral uses Indigo accent line.
- Auto-dismiss (3–5s) with pause-on-hover; one-line messages preferred.

Card

- `rounded-lg border shadow-md` with `bg-white` (light) / `bg-gray-900` (dark); internal spacing `p-4`.

List item

- Density suitable for `SpawnList`: compact `py-2 px-3`, hover background, selected border/accent bar.

## Accessibility checklist

- All interactive elements keyboard reachable and operable (Enter/Space).
- Visible focus indicator at 3:1 contrast minimum.
- Text contrast AA: 4.5:1 for normal text; 3:1 for large text/icons.
- Proper semantics/ARIA on Radix primitives; label and description associations for inputs.

## Variants strategy

- Use a variant helper to encode size, intent, and state for primitives (e.g., Button, Input).
- Keep public props minimal: `variant`, `size`, `disabled`, `asChild` where applicable.

## Asset theming and icons

- Icon size defaults: 16–20px depending on control size; use `lucide-react`.
- Avoid color-only icon states; pair with shape or label where needed.

## Implementation notes (for later tasks)

- Install: `@radix-ui/react-*`, `sonner`, `lucide-react`, `tailwind-variants` (or `cva` + `tailwind-merge`), `tailwindcss-animate`, `@tailwindcss/forms`, `@tailwindcss/typography`.
- Set CSS variables in the global stylesheet and wire dark mode toggling.
- Seed `shadcn/ui` Button, Input, Dialog, DropdownMenu, Tooltip; adapt classes to tokens above.
