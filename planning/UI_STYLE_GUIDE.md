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

### Strategy

- Tailwind `dark` class applied to `<html>` or `<body>`.
- All colors defined as CSS variables in `src/index.css`.
- Variables override under `.dark` selector for dark mode.
- Source of truth: `src/index.css` for complete token definitions.

### Token System

**Accent Colors** (Brand - Indigo)

- `--color-accent`: Primary accent color
- `--color-accent-foreground`: Text on accent backgrounds
- `--color-accent-hover`: Hover state
- `--color-accent-active`: Active/pressed state
- `--color-ring`: Focus ring indicator

**Neutral Colors** (Grays)

- `--color-bg`: Page background
- `--color-fg`: Primary text
- `--color-muted`: Secondary/muted elements
- `--color-muted-foreground`: Muted text
- `--color-border`: Default borders
- `--color-border-strong`: Emphasized borders
- `--color-input`: Input backgrounds
- `--color-input-border`: Input borders

**Surface Layers** (Stacked backgrounds)

- `--color-surface-1`: Highest surface (cards, modals)
- `--color-surface-2`: Medium surface (panels)
- `--color-surface-3`: Lowest surface (backgrounds)

**Semantic Colors**

- `--color-success`: Success states (emerald)
- `--color-success-foreground`: Text on success backgrounds
- `--color-success-hover`: Success hover state
- `--color-warning`: Warning states (amber)
- `--color-warning-foreground`: Text on warning backgrounds
- `--color-warning-hover`: Warning hover state
- `--color-error`: Error states (red)
- `--color-error-foreground`: Text on error backgrounds
- `--color-error-hover`: Error hover state
- `--color-error-bg`: Error background containers
- `--color-error-border`: Error borders
- `--color-success-bg`: Success background containers
- `--color-success-border`: Success borders

### Token Usage Best Practices

**Always use CSS variables:**

```tsx
// ✅ CORRECT - Uses token system
className = "bg-[rgb(var(--color-surface-1))] text-[rgb(var(--color-fg))]";
className = "border-[rgb(var(--color-border))]";
className = "text-[rgb(var(--color-warning))]";

// ❌ WRONG - Hardcoded Tailwind colors
className = "bg-white text-gray-900";
className = "border-gray-200";
className = "text-amber-600";
```

**Opacity modifiers for backgrounds:**

```tsx
// ✅ CORRECT - Token with opacity
className =
  "bg-[rgb(var(--color-warning))]/10 border-[rgb(var(--color-warning))]/20";

// ❌ WRONG - Hardcoded color with opacity
className = "bg-amber-500/10 border-amber-500/20";
```

**Focus states:**

```tsx
// ✅ CORRECT - Uses --color-ring token
className =
  "focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2";

// ❌ WRONG - Hardcoded focus color
className = "focus:ring-2 focus:ring-indigo-500";
```

### Testing Dark Mode

1. **Toggle dark mode** and verify all UI elements adapt correctly
2. **Check contrast ratios** - Ensure WCAG AA compliance (4.5:1 for text, 3:1 for UI components) in both modes
3. **Test focus states** - Verify focus rings are visible on all interactive elements
4. **Verify semantic colors** - Warning, error, and success states should be clearly visible
5. **Check surface layers** - Ensure proper hierarchy with surface-1/2/3 tokens
6. **Test input fields** - Verify input backgrounds and borders are visible

### Common Pitfalls

❌ **Don't hardcode Tailwind colors**

- Never use `gray-200`, `amber-600`, `indigo-500` directly
- Always use CSS variable tokens

❌ **Don't assume colors work in both modes**

- Test all new UI in both light and dark mode
- Colors that work in light mode may have poor contrast in dark mode

❌ **Don't mix token and hardcoded approaches**

- Be consistent - if one element uses tokens, all should

✅ **Do use semantic tokens**

- Use `--color-warning` for warnings, not `amber-600`
- Use `--color-error` for errors, not `red-600`
- Use `--color-success` for success states, not `emerald-600`

✅ **Do use opacity modifiers with tokens**

- `bg-[rgb(var(--color-warning))]/10` for subtle warning backgrounds
- `/20` for borders, `/10` for backgrounds

✅ **Do test keyboard navigation**

- Focus rings must be visible in both light and dark mode
- Use `--color-ring` token for consistency

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

## Accessibility Guidelines

### Core Principles

- **Keyboard-First Design**: All functionality must be accessible via keyboard navigation
- **Screen Reader Support**: Proper ARIA labels, roles, and descriptions for all interactive elements
- **Focus Management**: Clear focus indicators and logical tab order throughout the application
- **WCAG AA Compliance**: Minimum contrast ratios and accessible color usage

### Tab Index Best Practices

#### Default Tab Order

- **Natural Document Flow**: Use `tabIndex={0}` sparingly - prefer natural DOM order
- **Skip Non-Interactive Elements**: Avoid `tabIndex={0}` on decorative elements
- **Remove from Tab Order**: Use `tabIndex={-1}` for programmatically focused elements

```tsx
// ✅ CORRECT - Natural tab order
<button>Save</button>
<input type="text" />
<button>Cancel</button>

// ✅ CORRECT - Skip decorative elements
<div tabIndex={-1} className="decorative-icon" />

// ❌ WRONG - Unnecessary tabIndex
<div tabIndex={0}>Static content</div>
```

#### Three-Panel Layout Tab Order

MediaSpawner's three-panel layout requires careful tab order management:

1. **Header Navigation** (Profile selector, settings, sync status)
2. **Left Panel** (Spawn list, create button)
3. **Center Panel** (Editor forms, spawn settings)
4. **Right Panel** (Asset management, library)
5. **Modal Overlays** (When open, trap focus within)

```tsx
// ✅ CORRECT - Logical panel tab order
<div className="three-panel-layout">
  <header className="tab-order-1">
    <ProfileSelector />
    <SettingsButton />
  </header>
  <aside className="tab-order-2">
    <SpawnList />
  </aside>
  <main className="tab-order-3">
    <SpawnEditor />
  </main>
  <aside className="tab-order-4">
    <AssetManagementPanel />
  </aside>
</div>
```

#### Skip Navigation Links

Provide skip links for keyboard users to bypass repetitive navigation:

```tsx
// ✅ CORRECT - Skip navigation implementation
<div className="skip-links">
  <a href="#main-content" className="sr-only focus:not-sr-only">
    Skip to main content
  </a>
  <a href="#spawn-list" className="sr-only focus:not-sr-only">
    Skip to spawn list
  </a>
  <a href="#asset-management" className="sr-only focus:not-sr-only">
    Skip to asset management
  </a>
</div>
```

### Focus Management Patterns

#### Modal Focus Trapping

All modals must trap focus and restore it when closed:

```tsx
// ✅ CORRECT - Modal focus management
const Modal = ({ isOpen, onClose, children }) => {
  const focusManagement = useModalFocusManagement();

  useEffect(() => {
    if (isOpen) {
      const cleanup = focusManagement.initializeFocusManagement(
        focusManagement.containerRef.current,
      );
      return cleanup;
    }
  }, [isOpen, focusManagement]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content ref={focusManagement.containerRef}>
        {children}
      </Dialog.Content>
    </Dialog.Root>
  );
};
```

#### Focus Restoration

Restore focus to trigger elements when modals/dialogs close:

```tsx
// ✅ CORRECT - Focus restoration pattern
const useFocusRestoration = () => {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousActiveElement.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  };

  return { saveFocus, restoreFocus };
};
```

#### Form Focus Management

Handle focus in complex forms with validation:

```tsx
// ✅ CORRECT - Form focus on error
const FormWithValidation = () => {
  const firstErrorRef = useRef<HTMLElement | null>(null);

  const handleSubmit = async (data) => {
    const errors = validateForm(data);
    if (errors.length > 0) {
      // Focus first error field
      firstErrorRef.current?.focus();
      return;
    }
    // Submit form
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={firstErrorRef} aria-invalid={hasError} />
    </form>
  );
};
```

### ARIA Implementation Standards

#### Dialog and Modal ARIA

```tsx
// ✅ CORRECT - Proper dialog ARIA
<Dialog.Root>
  <Dialog.Content
    role="dialog"
    aria-labelledby="dialog-title"
    aria-describedby="dialog-description"
  >
    <Dialog.Title id="dialog-title">Modal Title</Dialog.Title>
    <Dialog.Description id="dialog-description">
      Modal description for screen readers
    </Dialog.Description>
    <Dialog.Close aria-label="Close modal">
      <X />
    </Dialog.Close>
  </Dialog.Content>
</Dialog.Root>
```

#### Form Field ARIA

```tsx
// ✅ CORRECT - Form field accessibility
<div>
  <label htmlFor="spawn-name" id="spawn-name-label">
    Spawn Name
  </label>
  <input
    id="spawn-name"
    aria-labelledby="spawn-name-label"
    aria-describedby="spawn-name-help spawn-name-error"
    aria-invalid={hasError}
    aria-required="true"
  />
  <div id="spawn-name-help" className="text-sm text-muted">
    Enter a descriptive name for your spawn
  </div>
  {hasError && (
    <div id="spawn-name-error" role="alert" className="text-error">
      {errorMessage}
    </div>
  )}
</div>
```

#### List and Navigation ARIA

```tsx
// ✅ CORRECT - List accessibility
<ul role="listbox" aria-label="Spawn list">
  {spawns.map((spawn) => (
    <li
      key={spawn.id}
      role="option"
      aria-selected={selectedSpawnId === spawn.id}
      tabIndex={0}
    >
      {spawn.name}
    </li>
  ))}
</ul>
```

### Keyboard Navigation Standards

#### Standard Keyboard Shortcuts

- **Tab**: Move to next focusable element
- **Shift+Tab**: Move to previous focusable element
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals, dialogs, and dropdowns
- **Arrow Keys**: Navigate within lists and menus

#### Custom Keyboard Navigation

```tsx
// ✅ CORRECT - Arrow key navigation for lists
const SpawnList = () => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, spawns.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        selectSpawn(spawns[focusedIndex]);
        break;
    }
  };

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0}>
      {spawns.map((spawn, index) => (
        <div key={spawn.id} className={index === focusedIndex ? "focused" : ""}>
          {spawn.name}
        </div>
      ))}
    </div>
  );
};
```

### Accessibility Testing Standards

#### Testing Library Queries

Use semantic queries that match how users interact with the interface:

```tsx
// ✅ CORRECT - Testing Library accessibility queries
import { screen } from "@testing-library/react";

// Test by role (preferred)
const button = screen.getByRole("button", { name: "Save" });
const dialog = screen.getByRole("dialog");
const listbox = screen.getByRole("listbox");

// Test by accessible name
const closeButton = screen.getByLabelText("Close modal");
const input = screen.getByLabelText("Spawn name");

// Test by text content (fallback)
const heading = screen.getByText("Create New Spawn");
```

#### Focus Management Testing

```tsx
// ✅ CORRECT - Focus management tests
import {
  keyboardUtils,
  modalUtils,
} from "../test-utils/accessibilityTestUtils";

it("traps focus within modal", async () => {
  render(<Modal isOpen={true} />);

  const dialog = screen.getByRole("dialog");
  const focusResults = await modalUtils.testModalFocusManagement(dialog);

  expect(focusResults.focusTrapped).toBe(true);
});

it("handles escape key", async () => {
  const onClose = vi.fn();
  render(<Modal isOpen={true} onClose={onClose} />);

  keyboardUtils.escape();
  expect(onClose).toHaveBeenCalled();
});
```

#### ARIA Attribute Testing

```tsx
// ✅ CORRECT - ARIA attribute validation
import { ariaUtils } from "../test-utils/accessibilityTestUtils";

it("has proper ARIA attributes", () => {
  render(<Modal isOpen={true} title="Test Modal" />);

  const dialog = screen.getByRole("dialog");
  const ariaResults = ariaUtils.validateAriaAttributes(dialog, {
    role: "dialog",
  });

  expect(ariaResults.role.valid).toBe(true);
});
```

#### Keyboard Navigation Testing

```tsx
// ✅ CORRECT - Keyboard navigation tests
it("supports arrow key navigation", async () => {
  render(<SpawnList spawns={testSpawns} />);

  const listbox = screen.getByRole("listbox");

  // Test arrow down
  fireEvent.keyDown(listbox, { key: "ArrowDown" });
  expect(document.activeElement).toHaveTextContent("Second Spawn");

  // Test arrow up
  fireEvent.keyDown(listbox, { key: "ArrowUp" });
  expect(document.activeElement).toHaveTextContent("First Spawn");
});
```

### Color and Contrast Standards

#### WCAG AA Compliance

- **Normal Text**: 4.5:1 contrast ratio minimum
- **Large Text**: 3:1 contrast ratio minimum
- **UI Components**: 3:1 contrast ratio minimum
- **Focus Indicators**: 3:1 contrast ratio minimum

#### Accessible Color Usage

```tsx
// ✅ CORRECT - Accessible color tokens
className = "text-[rgb(var(--color-fg))]"; // High contrast text
className = "text-[rgb(var(--color-muted-foreground))]"; // Secondary text
className = "bg-[rgb(var(--color-error))]"; // Error states
className = "border-[rgb(var(--color-border))]"; // Borders

// ❌ WRONG - Low contrast colors
className = "text-gray-400"; // May not meet contrast requirements
className = "bg-gray-100"; // May not be visible in dark mode
```

#### Focus Indicator Standards

```tsx
// ✅ CORRECT - Consistent focus indicators
className =
  "focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2";

// Ensure focus rings are visible in both light and dark modes
// Test with keyboard navigation to verify visibility
```

### Screen Reader Support

#### Live Regions for Dynamic Content

```tsx
// ✅ CORRECT - Screen reader announcements
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>

// For urgent updates
<div aria-live="assertive" aria-atomic="true" className="sr-only">
  {errorMessage}
</div>
```

#### Descriptive Text and Labels

```tsx
// ✅ CORRECT - Descriptive accessible names
<button aria-label="Delete spawn 'My Test Spawn'">
  <Trash />
</button>

<input
  aria-label="Search spawns"
  placeholder="Type to search..."
/>

// Use visible text when possible
<button>
  <Save />
  Save Changes
</button>
```

### Accessibility Checklist

#### Pre-Development

- [ ] Identify all interactive elements and their keyboard equivalents
- [ ] Plan tab order for complex layouts
- [ ] Design focus indicators that meet contrast requirements
- [ ] Plan ARIA labels and descriptions for complex components

#### During Development

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible and meet contrast requirements
- [ ] ARIA labels and descriptions are properly associated
- [ ] Form validation errors are announced to screen readers
- [ ] Modal focus trapping works correctly
- [ ] Skip navigation links are implemented

#### Testing

- [ ] Test with keyboard-only navigation
- [ ] Test with screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Verify color contrast ratios meet WCAG AA standards
- [ ] Test focus management in modals and complex forms
- [ ] Verify ARIA attributes with accessibility testing utilities

#### Post-Development

- [ ] Run automated accessibility tests
- [ ] Manual keyboard navigation testing
- [ ] Screen reader testing with real users
- [ ] Color contrast validation
- [ ] Focus management verification

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
