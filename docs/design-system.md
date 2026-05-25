# AgenticBuilder design system

**Last updated:** 2026-05-25
**Inspiration:** [theblackpot.dreamforgeworld.com](https://theblackpot.dreamforgeworld.com/menu) — the brand family this template ships with.

This is the trunk's default brand. When your fork is meant for a different identity, swap the tokens + fonts in one go (`globals.css` + `layout.tsx`) and rewrite this doc to match. Don't sprinkle one-off overrides — if it's not a token, propose adding one.

## Brand identity

| Property | Value |
|---|---|
| **Brand color** (orange) | `#C9892F` |
| **Brand hover** | `#A56C25` |
| **Brand soft** (use on dark bg for text accents) | `#E8A95F` |
| **Display font** | [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) (Google Fonts, weight 400) — for brand wordmark, page titles, h1/h2/h3, anything that should feel handwritten / warm. **Never** use for body, forms, table cells, or anything <14px. |
| **Sans font** | [Inter](https://fonts.google.com/specimen/Inter) — body, forms, navigation, table cells, button labels. |

Both fonts are loaded via `next/font/google` in `src/app/layout.tsx` and exposed as CSS variables (`--font-display`, `--font-sans`).

## Themes

Two themes: `light` (default, warm cream) and `dark` (deep warm brown). User picks via the sun/moon toggle in the navbar (powered by `next-themes`). System preference (`prefers-color-scheme`) is the fallback when no explicit choice has been made.

### Color tokens

Defined as CSS custom properties on `:root` / `.light` / `.dark` in `src/app/globals.css`. Reference them as `var(--<name>)` or via Tailwind utility classes that consume them (see below).

| Token | Light | Dark |
|---|---|---|
| `--background` | `#F5EFE0` (warm cream) | `#14090A` (deep warm brown) |
| `--foreground` | `#2A1F18` (dark warm brown) | `#F5EFE0` (warm cream) |
| `--card` | `#FAF6EA` (slightly lighter than bg) | `#1F1410` (slightly lighter than bg) |
| `--border` | `#E0D2A8` | `#3F3625` |
| `--color-brand` | `#C9892F` | `#C9892F` (shared across themes) |

### Warm neutral palette (overrides Tailwind's defaults)

The Tailwind `neutral-*` scale is **redefined globally** in the `@theme` block of `globals.css` so existing classes like `bg-neutral-100`, `dark:bg-neutral-800`, `border-neutral-200` automatically pick up warm browns. **Do not assume cold greys** — these are all warm browns now.

| Shade | Value | Typical use |
|---|---|---|
| `neutral-50` | `#F8F2E3` | lightest backgrounds |
| `neutral-100` | `#F0E7CF` | subtle hover, secondary button bg (light mode) |
| `neutral-200` | `#E0D2A8` | borders, dividers (light mode) |
| `neutral-300` | `#C9B580` | strong borders |
| `neutral-400` | `#A89263` | muted icons |
| `neutral-500` | `#806E4A` | muted text, helper labels |
| `neutral-600` | `#5C4F35` | secondary text |
| `neutral-700` | `#3F3625` | borders (dark mode) |
| `neutral-800` | `#2A2418` | secondary button bg (dark mode) |
| `neutral-900` | `#1A1410` | card bg (dark mode); deep panels |
| `neutral-950` | `#14090A` | page bg (dark mode); deepest |

### Status / semantic colors

Trunk doesn't ship lifecycle states, but reserve Tailwind's `blue-*`, `green-*`, `yellow-*`, `red-*` palettes for **semantic meaning only** (info / success / warning / error). Don't warm-tint them away.

Example pattern used downstream (apptracker's `<StatusChip>`):

| Meaning | Light | Dark |
|---|---|---|
| `info` | `bg-blue-100 text-blue-800` | `bg-blue-950 text-blue-300` |
| `success` | `bg-green-100 text-green-800` | `bg-green-950 text-green-300` |
| `warning` | `bg-yellow-100 text-yellow-800` | `bg-yellow-950 text-yellow-300` |
| `error` | `bg-red-100 text-red-800` | `bg-red-950 text-red-300` |

## Typography

| Element | Font | Weight | Size class | Notes |
|---|---|---|---|---|
| Brand wordmark ("AgenticBuilder") | Patrick Hand | 400 | `text-lg` | `font-display font-semibold` |
| Page title (h1) | Patrick Hand | 400 | `text-2xl` to `text-4xl` | landing uses 4xl, app pages 2xl |
| Section heading (h2) | Patrick Hand | 400 | `text-xl` to `text-2xl` | |
| Sub-heading (h3) | Patrick Hand | 400 | `text-lg` | also card titles |
| Body | Inter | 400 | `text-sm` to `text-base` | |
| Muted / secondary | Inter | 400 | `text-sm` | `text-neutral-600 dark:text-neutral-400` |
| Button label | Inter | 500 (`font-medium`) | `text-sm` (default) | |
| Table cells / chips | Inter | 400 | `text-xs` to `text-sm` | |

Apply Patrick Hand explicitly with `font-display` class when you're NOT inside an `h1`/`h2`/`h3` (those pick it up via the global selector). Example: brand wordmark.

## Components

### Button (`src/components/ui/button.tsx`)

Variants:
- `primary` — orange brand bg, white text. Use for the dominant CTA on a page (one per screen; multiple primaries dilute the action).
- `secondary` — neutral fill. Use when a button should be visible but not draw attention.
- `ghost` — transparent until hover. Use for nav-like actions and table-row inline actions.
- `danger` — red. Use only for destructive actions (delete, sign out is borderline — currently `ghost`).

Sizes: `sm` (h-8), `md` (h-10, default), `lg` (h-11).

### Card (`src/components/ui/card.tsx`)

`<Card>` is the panel for grouped content. Uses `bg-white dark:bg-neutral-950` — light mode shows pure white, dark mode shows warm-deep-brown via the overridden palette.

Sub-components: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. `CardTitle` is a `<h3>` so it picks up Patrick Hand automatically.

### Input / Label (`src/components/ui/{input,label}.tsx`)

Inter font (inherited from body). Inputs get a 1px neutral border + brand-focused outline ring. Labels are bold neutral.

### ThemeToggle (`src/components/theme-toggle.tsx`)

Sun/moon icon button wired to `next-themes`. Lives in the navbar between user info and sign-out. Provider mounted in `src/components/theme-provider.tsx`.

### Navbar (`src/app/(app)/_components/Navbar.tsx`)

`AgenticBuilder` brand link uses `font-display text-lg font-semibold`. Other nav links are Inter, muted, hover-to-foreground. `<ThemeToggle>` lives between the user name and `<SignOutButton>`.

## Spacing + radius

- Base spacing follows Tailwind defaults (`gap-4`, `space-y-6`, `px-6 py-3`).
- Border radius: `rounded-md` for inputs/buttons, `rounded-lg` for cards, `rounded-full` for status chips + pill toggles.
- Page max-width: `max-w-4xl` for app pages, `max-w-md` for auth forms.

## Native form widgets

Native `<select>` open dropdowns and scrollbars are notoriously hard to theme. Two defenses (both shipped in trunk `globals.css`):

1. **`color-scheme: light` / `color-scheme: dark`** on `.light` / `.dark` classes — tells the browser to use the matching OS widget palette.
2. **Explicit `select option { background-color, color }`** — belt-and-braces for browsers that don't fully honor `color-scheme`.

If you add a custom dropdown, prefer a fully-custom (HeadlessUI / Radix) implementation so you bypass native-widget theming entirely.

## Inspiration

The look-and-feel is intentionally a sister of [theblackpot.dreamforgeworld.com](https://theblackpot.dreamforgeworld.com/menu). Apps in this brand family share:

- Warm cream / warm dark color palette
- Patrick Hand for headings + brand
- Inter for body
- Orange brand color
- Generous border radius (rounded pills + cards)

When making a new front-end decision, the test is: "Does this fit alongside The Black Pot's menu page?" If yes, it's on-brand.

## Forking this brand

If you're using AgenticBuilder for a project that isn't in this brand family, do a clean swap rather than overrides:

1. Replace fonts in `src/app/layout.tsx` (`next/font/google` import + CSS variables).
2. Replace tokens in `src/app/globals.css` — the `@theme` block (brand colors + neutral palette) and the `.light` / `.dark` blocks (background / foreground / card / border).
3. Rewrite this doc with the new brand's values.
4. Grep for `Patrick Hand`, `#C9892F`, `theblackpot` and clean up stragglers.

## How to extend this

- **New color token?** Add to `@theme { ... }` in `globals.css` AND update this doc's color tables in the same PR.
- **New font?** Same rule — add via `next/font/google` in `layout.tsx`, expose as a CSS variable, document here.
- **New component?** Document it under "Components" with its variants, sizes, and intended use cases.

If you find yourself reaching for a one-off color or font that isn't in this doc, stop and ask: "should this be a token?" If yes, add it. If no, you probably want one of the existing tokens.
