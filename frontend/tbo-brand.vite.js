// TBO's default logo, favicon, PWA icons and app name, applied at build time
// so upstream components and index.html stay untouched. Brand Settings
// uploads still win at runtime. See docs/tbo-theme.md.
import path from 'path'
import { TBO_BRAND_NAME } from './src/tbo/brand/brand.js'

const TBO_LOGO = path.resolve(import.meta.dirname, 'src/tbo/brand/TBOLogo.vue')
const UPSTREAM_MANIFEST_DIR = '/assets/crm/manifest/'
const TBO_MANIFEST_DIR = '/assets/crm/tbo/manifest/'
const TBO_FAVICON = '/assets/crm/tbo/favicon.svg'

/**
 * Serves the TBO mark wherever the stock logo is imported, makes the mark
 * itself (SVG, transparent) the favicon, and points index.html's
 * apple-touch-icon and iOS splash screens at crm/public/tbo/manifest/ (same
 * file names as upstream's). frappe-ui's usePageMeta treats this first
 * rel="icon" as the default and swaps in the Brand Settings favicon.
 */
export function tboBrand() {
  let logoSwapped = false
  return {
    name: 'tbo-brand',
    enforce: 'pre',
    resolveId(source) {
      // '@/components/Icons/CRMLogo.vue' reaches here already resolved by the alias
      if (
        source.replaceAll('\\', '/').endsWith('/components/Icons/CRMLogo.vue')
      ) {
        logoSwapped = true
        return TBO_LOGO
      }
    },
    // An upstream rename would otherwise ship the stock logo without a word.
    generateBundle() {
      if (!logoSwapped)
        this.error('tbo-brand: nothing imported components/Icons/CRMLogo.vue')
    },
    transformIndexHtml(html) {
      let out = html
      for (const [pattern, value] of [
        [
          /<link\s+rel="icon"[^>]*>/,
          `<link rel="icon" type="image/svg+xml" href="${TBO_FAVICON}" />`,
        ],
        [UPSTREAM_MANIFEST_DIR, TBO_MANIFEST_DIR],
        ['<title>Frappe CRM</title>', `<title>${TBO_BRAND_NAME}</title>`],
        [
          'name="apple-mobile-web-app-title" content="Frappe CRM"',
          `name="apple-mobile-web-app-title" content="${TBO_BRAND_NAME}"`,
        ],
      ]) {
        const next =
          typeof pattern === 'string'
            ? out.replaceAll(pattern, value)
            : out.replace(pattern, value)
        // Fail rather than ship stock branding when upstream's index.html changes.
        if (next === out)
          throw new Error(`tbo-brand: index.html has no match for ${pattern}`)
        out = next
      }
      return out
    },
  }
}

/** The PWA manifest with TBO's name and icons. */
export function tboManifest(manifest) {
  return {
    ...manifest,
    name: TBO_BRAND_NAME,
    short_name: TBO_BRAND_NAME,
    theme_color: '#3a748d', // brand teal (tbo-theme.css --brand)
    icons: manifest.icons.map((icon) => ({
      ...icon,
      src: icon.src.replace(UPSTREAM_MANIFEST_DIR, TBO_MANIFEST_DIR),
    })),
  }
}
