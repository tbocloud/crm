# TBO sidebar: auto-hide to the icon rail

The CRM's desktop sidebar behaves like the TBO Support hub's (tbocloud/helpdesk
`desk/src/components/layouts/AppSidebar.vue`, PR #115). It rests as the icon
rail and opens only when you go to it, like the Mac Dock. If you change the
behaviour here, change it in the hub too.

## What users see

- **Expands over the page, never pushing it.** The rail keeps its 3rem in the
  layout and the full sidebar (15rem) opens above the content with a shadow and
  a hairline border, in 200ms (instant with reduced motion: the theme's global
  `prefers-reduced-motion` rule wins over the `motion-safe:` duration). It opens
  after 120ms of hover, so a pointer passing across doesn't open it, and closes
  250ms after the pointer leaves.
- **Keyboard:** Tab into it and it opens. Only `:focus-visible` focus opens it,
  so a mouse click doesn't hold it open. Tabbing out closes it. Escape closes it
  and returns focus to where it came from, or to the page's `<main>`, which
  shows the theme's focus ring inset.
- **Touch:** the first tap on the rail opens it without acting; the next tap
  picks an item. A tap outside, or navigating, closes it (navigating leaves it
  open while the Notifications panel is open). Hover is never needed.
- **Stays open** while something it opened is still open: the brand menu (any
  `aria-haspopup` trigger inside it with `aria-expanded="true"`) or the
  Notifications panel. The Notifications panel opens beside the expanded width.
- **Pin:** the bottom control (it replaces the stock Collapse/Expand) reads
  "Keep sidebar open" with a pin icon, or "Auto-hide sidebar" with a pin-off
  icon once pinned. Pinned is the old expanded sidebar with the page laid out
  beside it. The choice is kept in localStorage per user
  (`tbo_sidebar_pinned:<user>`, default off, so everyone starts on auto-hide);
  `useStorage` falls back to memory when storage is blocked. The stock
  `isSidebarCollapsed` key is no longer read, because it would override the
  auto-hide default.
- **Brand:** the rail shows the TBO mark (or the Brand Settings logo); expanded,
  the header shows the mark plus "TBO CRM" or the Brand Settings name. The
  brand menu works in both states.
- **Tooltips:** frappe-ui's rail tooltips are unchanged. Hover, focus and tap
  all open the sidebar sooner, so in practice they don't show; items keep their
  accessible names.
- **Phones** (below 640px, where the CRM and the hub both switch to the mobile
  layout): the drawer is unchanged, with no pin control.

## Where it lives

| File | What it does |
| --- | --- |
| `frontend/src/tbo/sidebar/useAutoHideSidebar.js` | All of the state and event handling: hover intent and close delays, focus, touch, Escape, holding open, the pin and the notifications offset. Tested in `frontend/tests/unit/tboAutoHideSidebar.test.js`. |

Small hooks into upstream files:

| Upstream file | Hook |
| --- | --- |
| `frontend/src/components/Layouts/AppSidebar.vue` | The root wrapper takes `ref="shell"`, `v-bind="shellListeners"` and `w-12` while auto-hiding; `Sidebar` takes `:collapsed="isCollapsed"` and the overlay classes; the Collapse/Expand item is the pin control; `Notifications` takes `:style="notificationsStyle"`. |
| `frontend/src/components/Layouts/DesktopLayout.vue` | The page column is `<main tabindex="-1">`, so Escape can hand focus to it. |

On an upstream merge conflict in one of these, keep upstream's change and add
the hook back.

## Not copied from the hub

- The hub's tinted icon tiles: a hub-only exception. The CRM keeps one accent.
- The hub's rail Search and theme items and its follow-up strip: the CRM has no
  sidebar search card, theme button or follow-ups.
