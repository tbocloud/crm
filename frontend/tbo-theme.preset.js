// TBO theme utilities (bg-brand, text-brand-ink, bg-success-soft, ...).
// The values live in src/tbo-theme.css; see docs/tbo-theme.md.
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          soft: 'var(--brand-soft)',
          ink: 'var(--brand-ink)',
          on: 'var(--on-brand)',
        },
        highlight: 'var(--highlight)',
        success: { DEFAULT: 'var(--success)', soft: 'var(--success-soft)' },
        warning: { DEFAULT: 'var(--warning)', soft: 'var(--warning-soft)' },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)' },
        info: { DEFAULT: 'var(--info)', soft: 'var(--info-soft)' },
      },
      // Upstream still uses some frappe-ui v1 (and misspelt) token classes
      // that compile to nothing on v2. Aliasing them here, to the v2 token
      // frappe-ui's own migrate-tokens-v2 maps them to, fixes them without
      // touching upstream files; drop an alias once upstream renames the class.
      backgroundColor: {
        'surface-white': 'var(--surface-base)',
        'surface-modal': 'var(--surface-elevation-2)',
        'surface-modals': 'var(--surface-elevation-2)',
        'surface-transparent': 'transparent',
        'outline-gray-3': 'var(--outline-gray-3)', // a 1px rule drawn as a fill
        'ink-red-1': 'var(--surface-red-1)', // danger menu item hover
      },
      borderColor: {
        'outline-gray-modals': 'var(--outline-elevation-2)',
        'ink-gray-8': 'var(--ink-gray-8)', // selected option, matches its text
      },
      boxShadowColor: {
        'surface-base': 'var(--surface-base)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
}
