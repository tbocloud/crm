// Pure rules of the lead's Quotations tab (docs/tbo-lead-pipeline.md). The
// server decides and checks everything; these only shape the UI. Tested in
// tests/unit/tboLeadPipeline.test.js.

export const QUOTE = {
  DRAFT: 'Draft',
  PENDING: 'Pending Approval',
  APPROVED: 'Approved',
  SENT: 'Sent to Client',
  VIEWED: 'Viewed / Acknowledged',
  NEGOTIATING: 'Under Negotiation',
  REVISION: 'Revision Required',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
}

const WITH_CLIENT = [
  QUOTE.SENT,
  QUOTE.VIEWED,
  QUOTE.NEGOTIATING,
  QUOTE.REVISION,
]

// The moves a person makes by hand, from the statuses each comes from (the
// server's MANUAL rule).
const MANUAL = {
  [QUOTE.VIEWED]: [QUOTE.SENT],
  [QUOTE.NEGOTIATING]: [QUOTE.SENT, QUOTE.VIEWED, QUOTE.REVISION],
  [QUOTE.REVISION]: [QUOTE.SENT, QUOTE.VIEWED, QUOTE.NEGOTIATING],
  [QUOTE.ACCEPTED]: WITH_CLIENT,
  [QUOTE.REJECTED]: WITH_CLIENT,
}

// Colour only where it means something, always with an icon and the text.
export function quoteTone(status) {
  switch (status) {
    case QUOTE.ACCEPTED:
      return { tone: 'success', icon: 'check' }
    case QUOTE.REJECTED:
    case QUOTE.EXPIRED:
      return { tone: 'danger', icon: 'x' }
    case QUOTE.PENDING:
    case QUOTE.REVISION:
      return { tone: 'warning', icon: 'alert' }
    case QUOTE.SENT:
    case QUOTE.VIEWED:
    case QUOTE.NEGOTIATING:
      return { tone: 'info', icon: 'clock' }
    default:
      return { tone: 'neutral', icon: 'dot' }
  }
}

// What a quotation row offers, by its status and the user's rights.
export function quoteActions(row, { canWrite, canOrder, deal }) {
  const status = row.tbo_quote_status || QUOTE.DRAFT
  const draft = row.docstatus === 0
  const write = Boolean(canWrite)
  return {
    edit: write && draft,
    // only the latest revision goes out; an older one waits for its revision
    send:
      write &&
      Boolean(row.tbo_is_latest) &&
      ((draft && status !== QUOTE.PENDING) ||
        (!draft && status === QUOTE.APPROVED)),
    revise: write && row.docstatus !== 2 && Boolean(row.tbo_is_latest),
    moves: write
      ? Object.keys(MANUAL).filter((target) => MANUAL[target].includes(status))
      : [],
    order: Boolean(canOrder && deal) && status === QUOTE.ACCEPTED,
  }
}

// Families, newest first, each with its revisions newest first; the latest
// revision leads its family.
export function groupFamilies(rows) {
  const families = new Map()
  for (const row of rows) {
    const key = row.tbo_quote_family || row.name
    if (!families.has(key)) families.set(key, [])
    families.get(key).push(row)
  }
  return [...families.values()].map((members) =>
    [...members].sort(
      (a, b) => (b.tbo_revision_no || 0) - (a.tbo_revision_no || 0),
    ),
  )
}

const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })

// Plain lines for a revision's changes from the one before it.
export function changeLines(changes) {
  if (!changes) return []
  const lines = []
  const [before, after] = changes.grand_total || []
  if (before !== after) lines.push(`Grand total ${fmt(before)} → ${fmt(after)}`)
  const [discountBefore, discountAfter] = changes.discount_percent || []
  if (discountBefore !== discountAfter)
    lines.push(`Discount ${fmt(discountBefore)}% → ${fmt(discountAfter)}%`)
  for (const name of changes.added || []) lines.push(`Added ${name}`)
  for (const name of changes.removed || []) lines.push(`Removed ${name}`)
  for (const row of changes.changed || []) {
    const parts = []
    if (row.qty[0] !== row.qty[1])
      parts.push(`qty ${fmt(row.qty[0])} → ${fmt(row.qty[1])}`)
    if (row.rate[0] !== row.rate[1])
      parts.push(`rate ${fmt(row.rate[0])} → ${fmt(row.rate[1])}`)
    lines.push(`${row.item_name || row.item_code}: ${parts.join(', ')}`)
  }
  if (changes.terms_changed) lines.push('Terms changed')
  return lines.length ? lines : ['No changes']
}

// The printable view and the PDF download of a quotation in the TBO format.
export function printUrls(name, format = 'TBO Quotation') {
  const query = `doctype=Quotation&name=${encodeURIComponent(name)}&format=${encodeURIComponent(format)}`
  return {
    view: `/printview?${query}&trigger_print=0&no_letterhead=1`,
    pdf: `/api/method/frappe.utils.print_format.download_pdf?${query}&no_letterhead=1`,
  }
}
