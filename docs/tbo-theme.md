# TBO theme

TBO's CRM looks like the TBO Support hub (tbocloud/helpdesk). It uses the same
cool-tinted neutrals and Geist type. The TBO logo teal is the only accent, and
the logo orange is used only for the focus ring and for today in date pickers.
The source of truth for the palette is the hub's `desk/src/theme.css` and
`docs/ui-guidelines.md` §8. This theme copies the values the CRM needs.

## Where it lives

Nearly all of the theme is in new files, so upstream merges from
frappe/crm rarely touch it:

| File | What it does |
| --- | --- |
| `frontend/src/tbo-theme.css` | Re-points frappe-ui's v2 tokens (`--surface-gray-*`, `--ink-gray-*`, `--outline-gray-*`, dark `--surface-base`/`--ink-base`). Defines `--brand*`, `--highlight`, the status colours and the fonts. Recolours frappe-ui components: solid and blue buttons, the active sidebar item, tab indicators, segmented controls, the focus ring and today in date pickers. |
| `frontend/src/fonts/Geist/` | Self-hosted Geist and Geist Mono variable fonts (SIL OFL, licence alongside), so the PWA keeps its type offline and no request goes to a third-party font CDN. |
| `frontend/tbo-theme.preset.js` | Tailwind preset that adds the `brand`, `highlight`, `success`, `warning`, `danger` and `info` colours (each with `-soft` where it applies), sets `font-sans`/`font-mono` to Geist, and aliases the v1 token classes upstream still uses (see [Legacy token aliases](#legacy-token-aliases)). |
| `frontend/tbo-brand.vite.js` | Build-time branding (see [Logo, favicon and name](#logo-favicon-and-name)). |
| `frontend/src/tbo/brand/` | `TBOLogo.vue` (the mark as a component) and `brand.js` (`TBO_BRAND_NAME = 'TBO CRM'`). |
| `crm/public/tbo/` | `tbo-mark.svg` (source), `favicon.svg`, and `manifest/` with TBO's PWA icons, apple-touch-icon and iOS splash screens. `scripts/tbo-brand-assets.sh` regenerates `manifest/` from `tbo-mark.svg`. |

Small hooks wire those files into upstream files:

| Upstream file | Hook |
| --- | --- |
| `frontend/src/index.css` | `@import './tbo-theme.css';` after the frappe-ui imports |
| `frontend/tailwind.config.js` | `import tboThemePreset from './tbo-theme.preset.js'` and `presets: [frappeUIPreset, tboThemePreset]` |
| `frontend/vite.config.js` | `workbox.globPatterns` adds `woff2`, so the PWA precaches the fonts; `tboBrand()` first in `plugins`; `manifest: tboManifest({...})` |
| `frontend/src/stores/settings.js` | `brand.name` falls back to `TBO_BRAND_NAME` (initial value and in `setupBrand`) |
| `crm/hooks.py` | `app_icon_url`, `app_icon_title` and the `add_to_apps_screen` logo and title point at the TBO mark and "TBO CRM" (the /apps screen and the desk app switcher) |

Three one-line class swaps replace hard-coded blue accents:

- `components/Settings/AssignmentRules/AssigneeRules.vue`: the "Last" chip
  now uses `bg-brand-soft text-brand-ink`.
- `components/Settings/Hierarchy/useDragDrop.js`: the drop indicator now uses
  `!border-brand`.
- `components/IconPicker.vue`: the blue focus ring is removed, so emoji buttons
  get the theme's focus ring.

Two one-line fixes for upstream layout bugs (worth sending upstream):

- `components/Mobile/MobileSidebar.vue`: the drawer overlay is `bg-black/50`
  instead of `bg-surface-gray-8 bg-opacity-50`, which is a light grey in dark
  mode.
- `components/Activities/ActivityHeader.vue`: `mx-3` below `sm`, so the
  Activity/Emails/… header lines up with the `px-3` content at 390px.

## Logo, favicon and name

The default brand is TBO's mark and "TBO CRM". **Brand Settings
(FCRM Settings: brand name, logo, favicon) still override all of it**: the
sidebar shows the uploaded logo and name, and record pages set the uploaded
favicon through frappe-ui's `usePageMeta`.

**The mark is a redraw.** `crm/public/tbo/tbo-mark.svg` was vectorised from the
191×80 PNG on teambackoffice.com, not taken from official artwork. When TBO's
official vector turns up, replace `tbo-mark.svg`, `favicon.svg` and the paths
in `frontend/src/tbo/brand/TBOLogo.vue`, then run
`PYTHON=<python with Pillow> scripts/tbo-brand-assets.sh` (needs
`rsvg-convert`). The same mark is in the TBO Smart app
(tbocloud/tbo_smart_mobile `assets/brand/tbo-mark.svg`).

`frontend/tbo-brand.vite.js` does the swap at build time, so no upstream
component or `index.html` line changes:

- `resolveId` serves `src/tbo/brand/TBOLogo.vue` wherever
  `@/components/Icons/CRMLogo.vue` is imported: the sidebar's `BrandLogo`
  fallback, Preferences, the onboarding/help panel, the questionnaire and the
  About dialog.
- `transformIndexHtml` makes `/assets/crm/tbo/favicon.svg` (transparent, so it
  reads on light and dark tabs) the first `rel="icon"`, which `usePageMeta`
  keeps as the default favicon; points the apple-touch-icon and the 34 iOS
  splash screens from `/assets/crm/manifest/` to `/assets/crm/tbo/manifest/`
  (same file names); and sets `<title>` and `apple-mobile-web-app-title` to
  "TBO CRM".
- `tboManifest()` gives the PWA manifest the name "TBO CRM", the brand teal as
  `theme_color`, and the icons from `/assets/crm/tbo/manifest/`.

Not changed here: **Frappe's `/login` page.** It belongs to Frappe, not the
CRM, and takes its logo from Website Settings / Navbar Settings `app_logo`,
else from the apps' `app_logo_url` hooks (on india.teambackoffice.com that is
ERPNext's logo and favicon). Adding a CRM `app_logo_url` hook would not help
there: with three apps declaring one, Frappe falls back to its own logo. To
brand it, a site admin sets Website Settings → App Logo and Favicon (and
Navbar Settings → App Logo) to the TBO mark.

## Legacy token aliases

Upstream still uses some frappe-ui v1 token classes (and a few misspelt ones)
that compile to nothing on v2: `bg-surface-white`, `bg-surface-modal`,
`bg-surface-modals`, `bg-surface-transparent`, `bg-outline-gray-3`,
`hover:bg-ink-red-1`, `border-outline-gray-modals`,
`divide-outline-gray-modals`, `border-ink-gray-8` and `shadow-surface-base`.
`tbo-theme.preset.js` aliases each one to the v2 token frappe-ui's own
`migrate-tokens-v2` maps it to (for example `surface-white` → `surface-base`,
`surface-modal` → `surface-elevation-2`, `outline-gray-modals` →
`outline-elevation-2`).

They are aliased rather than renamed in place because renaming touches about a
dozen upstream files that frappe/crm will rename itself; every such line would
conflict on the next merge. The aliases touch no upstream file. When upstream
renames a class, its alias becomes unused; delete it then. To list what still
compiles to nothing, build and compare the `(bg|border|…)-(surface|ink|outline)-*`
classes in `frontend/src` against `crm/public/frontend/assets/*.css`.

## Palette

| Token | Light | Dark |
| --- | --- | --- |
| `brand` | `#3a748d` | `#6fb4cf` |
| `brand-hover` | `#2a5766` | `#8dc5da` |
| `brand-soft` | `#e6f0f4` | `#15303b` |
| `brand-ink` | `#2c5f75` | `#a6d5e6` |
| `on-brand` | `#ffffff` | `#0b2129` |
| `highlight` (ring only) | `#c8641a` | `#f59a4a` |
| `success` / `-soft` | `#1c7547` / `#e6f4ec` | `#52c48d` / `#14281e` |
| `warning` / `-soft` | `#955700` / `#fdf2de` | `#f0b44c` / `#2d2311` |
| `danger` / `-soft` | `#bf3328` / `#fdebe9` | `#ff8c82` / `#34191a` |
| `info` / `-soft` | `#2f56c6` / `#e8edfb` | `#8da6ff` / `#16233f` |

Rules for new code:

- Use `brand` only for the primary action and the current selection.
- Use `highlight` only as a ring or marker, never as a fill or text colour.
- Use status colours only to carry meaning, and always with an icon or a label.
- Keep everything else on the neutral `surface`/`ink`/`outline` grays. Don't
  use gradients or decorative colour.
- If you change a value, change it in the hub too.

## Re-applying after an upstream merge

1. Merge `upstream/main` as usual. The theme files are TBO-only, so they
   can't conflict.
2. If a conflict hits one of the hooks in the tables above, keep upstream's
   change and add the hook line back.
3. Check that the theme's selectors still match the frappe-ui version
   `frontend/package.json` pins. When upgrading frappe-ui, look for these:
   - solid buttons still use `bg-surface-gray-10 text-ink-base`, and blue
     buttons still use `bg-surface-blue-6` / `bg-surface-blue-2 text-ink-blue-6`;
   - the sidebar still renders `data-slot="sidebar-item"` with
     `data-state="active"`;
   - `TabButtons` still renders `data-slot="tab-button"`, and the `Tabs`
     indicator is still `bg-surface-gray-10` inside `[role="tablist"]`;
   - the date picker's day cells still end their `aria-label` with `(Today)`;
   - the stock logo is still imported as `@/components/Icons/CRMLogo.vue`
     (`grep -rn CRMLogo frontend/src`), so `tbo-brand.vite.js` can swap it;
   - `index.html` still has one `rel="icon"` link and still loads its icons
     from `/assets/crm/manifest/`; if upstream adds or renames a file there,
     rerun `scripts/tbo-brand-assets.sh`.

   If a check fails, change the selector in `tbo-theme.css`. Don't edit the
   component.
4. Check whether upstream added new hard-coded accents:
   `grep -rnE "(bg|text|border|ring)-(violet|purple|indigo|blue)-[0-9]" frontend/src`.
   Leave colours that carry meaning (for example the WhatsApp reply quote,
   where blue means outgoing and green means incoming).
5. Build with `cd frontend && yarn build`. In both light and dark, check the
   Leads list, a lead, the Deals kanban and the sidebar at desktop width and
   at 390px.
