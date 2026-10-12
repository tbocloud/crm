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
| `frontend/src/tbo-theme.css` | Re-points frappe-ui's v2 tokens (`--surface-gray-*`, `--ink-gray-*`, `--outline-gray-*`, dark `--surface-base`/`--ink-base`). Defines `--brand*`, `--highlight`, the status colours and the fonts. Recolours frappe-ui components: solid and blue buttons, the active sidebar item, tab indicators, segmented controls, the focus ring, today in date pickers and the stock CRM logo. |
| `frontend/src/fonts/Geist/` | Self-hosted Geist and Geist Mono variable fonts (SIL OFL, licence alongside), so the PWA keeps its type offline and no request goes to a third-party font CDN. |
| `frontend/tbo-theme.preset.js` | Tailwind preset that adds the `brand`, `highlight`, `success`, `warning`, `danger` and `info` colours (each with `-soft` where it applies), and sets `font-sans`/`font-mono` to Geist. |

Two small hooks wire those files into upstream files:

| Upstream file | Hook |
| --- | --- |
| `frontend/src/index.css` | `@import './tbo-theme.css';` after the frappe-ui imports |
| `frontend/tailwind.config.js` | `import tboThemePreset from './tbo-theme.preset.js'` and `presets: [frappeUIPreset, tboThemePreset]` |

Three one-line class swaps replace hard-coded blue accents:

- `components/Settings/AssignmentRules/AssigneeRules.vue`: the "Last" chip
  now uses `bg-brand-soft text-brand-ink`.
- `components/Settings/Hierarchy/useDragDrop.js`: the drop indicator now uses
  `!border-brand`.
- `components/IconPicker.vue`: the blue focus ring is removed, so emoji buttons
  get the theme's focus ring.

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
   - the stock logo (`components/Icons/CRMLogo.vue`) still uses
     `fill="#EF0BF5"`.

   If a check fails, change the selector in `tbo-theme.css`. Don't edit the
   component.
4. Check whether upstream added new hard-coded accents:
   `grep -rnE "(bg|text|border|ring)-(violet|purple|indigo|blue)-[0-9]" frontend/src`.
   Leave colours that carry meaning (for example the WhatsApp reply quote,
   where blue means outgoing and green means incoming).
5. Build with `cd frontend && yarn build`. In both light and dark, check the
   Leads list, a lead, the Deals kanban and the sidebar at desktop width and
   at 390px.
