# TrackWork UI kit (`src/components/ui`)

Calm, Linear/Notion-style system. Light + dark, EN + MK, phone-first. Always use tokens, never raw hex.

## Tokens (`globals.css`, `tailwind.config.js`)
Source of truth = RGB channels (`--rgb-*`), so `bg-primary/10`, `ring-primary/25` work in both themes.

| Use | Classes |
| --- | --- |
| Page / card / hover / menu | `bg-background` / `bg-surface` / `bg-surface-hover` / `bg-surface-raised` |
| Inputs, wells / chips, tracks | `bg-secondary` / `bg-tertiary` |
| Lines | `border-border` (hairline), `border-border-strong` (buttons), `border-border-control` (inputs, >=3:1) |
| Text | `text-text-primary` (>=15:1), `text-text-secondary` (>=7:1), `text-text-muted` (>=4.9:1) |
| Brand / status fill | `bg-primary` (`hover:`/`active:` variants), `bg-success`, `bg-warning`, `bg-danger` |
| Brand / status TEXT | `text-primary`, `text-success`, `text-warning`, `text-danger` (auto "ink" shade, AA on tints) |
| Tints | `bg-primary/10`, `bg-danger/10`, ... pair with the matching `text-*` |
| Elevation | `shadow-xs/sm/md/lg/xl`, `shadow-pop` (menus), `shadow-btn`, `shadow-btn-primary` |
| Radius | controls `rounded-lg`, cards/dialogs `rounded-2xl` |
| Focus | global `:focus-visible` outline; controls use `focus-visible:ring-2 ring-primary` |
| Motion | `animate-fade-in`, `animate-dialog-in`, `animate-pop-in`, `animate-shimmer`; all honour reduced-motion |
| Utilities | `scrollbar-thin`, `scrollbar-hide`, `tabular-nums`, `.num`, `pt-safe` / `pb-safe`, `.skeleton` |
| z-index | header 40, sheet/menu 70, tooltip 75, dialog 80, toast 95 |

Legacy `.card .btn-primary .btn-secondary .btn-ghost .input-field .badge-*` still work and match.

## Components
- `Button` (+ `buttonClasses()` for links): variant, size, `loading`, `leftIcon/rightIcon`, `iconOnly`, `fullWidth`.
- `Dialog` (sizes sm|md|lg|xl, focus trap, stacked footer on phone). On phones sm|md are bottom sheets (grab handle, swipe down to close), lg|xl full-screen; all follow the on-screen keyboard (footer stays reachable). `ConfirmDialog` and `useConfirm()` (no `window.confirm`).
- `BottomSheet` (portal sheet for pickers / small menus; handle, swipe, scroll lock, safe areas), `useSheetDrag` (the swipe hook).
- `IconMenu` (portal, keyboard, bottom sheet on phone), `Tooltip`, `Toast` (`useToast()`).
- `Input` / `Textarea` / `Select` / `Field` (label, hint, error wiring), `inputClasses()`.
- `SegmentedControl`, `Tabs`, `Chip`, `Badge`, `Kbd`, `Avatar` / `AvatarGroup`.
- `PageHeader` (breadcrumbs, meta, sticky), `EmptyState` (icon), `TaskRow` (priority/due chips, swipe), `Skeleton*`.

## Mobile conventions (the shell does the heavy lifting)
- `<main>` already clears the fixed tab bar and FAB: never add bottom padding for them. Custom fixed bottom bars use the `bottom-nav` class.
- One floating "+" (FAB) exists, owned by AppShell (see its header comment for the route list). Pages never add their own.
- `hover:` only applies on devices that can hover (`hoverOnlyWhenSupported`), so give pressed feedback with `active:`.
- Phones: every input/select/textarea renders at >= 16px automatically (no iOS zoom); `Input` derives `inputMode` / `autoComplete` from `type`.
- Safe areas: `pt-safe` / `pb-safe` / `pl-safe` / `pr-safe` or `env(safe-area-inset-*)`; use `dvh`, never `vh`.

## Do
- Phone first: controls >= 40px tall, inputs 16px text on phone, no hover-only actions on touch.
- Every icon-only control gets `aria-label` (translated); strings come from next-intl in EN **and** MK.
- Use `ConfirmDialog`/`useConfirm` for destructive actions, `toast` for feedback, `EmptyState` for empty lists.
- Numbers in tables/timers: `tabular-nums`.

## Don't
- Don't hard-code colours (`#2563eb`, `bg-blue-600`, `text-gray-500`) or `dark:` colour pairs: tokens already flip.
- Don't use `text-primary` etc. as a *background* colour, or `bg-primary` text without `text-white`.
- Don't nest `overflow-hidden` around menus (IconMenu portals anyway) or set your own z-index above 80 for non-dialogs.
- Don't add page-level `max-w`/gutters: `AppShell` provides them.
