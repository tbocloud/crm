// Pure rules for the smart lead screens (docs/tbo-smart-leads.md). The server
// decides scores, lists and permissions; these only format and validate.

export { isPermissionError, localToday } from '@/tbo/finance/finance'

const NON_DIGITS = /\D/g

// International digits without "+", or null. Ten digits are Indian (+91), as on
// the server (tbo_smart.smart_leads.utils.normalise_phone).
export function normalisePhone(phone) {
  const raw = String(phone || '').trim()
  let digits = raw.replace(NON_DIGITS, '')
  if (raw.startsWith('00')) digits = digits.slice(2)
  else if (!raw.startsWith('+')) {
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
    if (digits.length === 10) digits = `91${digits}`
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null
}

export function whatsappLink(phone, text) {
  const digits = normalisePhone(phone)
  if (!digits) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function telLink(phone) {
  const digits = normalisePhone(phone)
  return digits ? `tel:+${digits}` : null
}

// Hot / Warm / Cold carry meaning, so each has a status colour and a label.
const BANDS = {
  Hot: { tone: 'danger', classes: 'bg-danger-soft text-danger' },
  Warm: { tone: 'warning', classes: 'bg-warning-soft text-warning' },
  Cold: { tone: 'gray', classes: 'bg-surface-gray-2 text-ink-gray-7' },
}

export function bandStyle(band) {
  return BANDS[band] || BANDS.Cold
}

// Why a lead is on the list, in the order the server sorts them.
export const WHY_LABELS = {
  overdue: 'Follow-up overdue',
  due_today: 'Follow-up due today',
  best_score: 'No follow-up planned',
}

// "today", "yesterday", "3 days ago" for a whole number of days.
export function daysAgo(days) {
  if (days === null || days === undefined) return ''
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

// The date part of a datetime string ("2026-10-15 10:00:00" -> "2026-10-15").
export function datePart(value) {
  return value ? String(value).slice(0, 10) : ''
}

// A next follow-up must be a date from today on. Returns an error or ''.
export function followUpError(date, today) {
  if (!date) return 'Pick a date.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Use a full date.'
  if (date < today) return "The next follow-up can't be in the past."
  return ''
}

// What the note box sends on confirm, from the (possibly edited) proposal.
export function notePayload(lead, draft) {
  return {
    lead,
    text: (draft.note || '').trim(),
    kind: draft.kind === 'call' ? 'call' : 'note',
    status: draft.next_status || null,
    follow_up_on: draft.follow_up_on || null,
    follow_up_reason: (draft.follow_up_reason || '').trim() || null,
  }
}

// Follow-up summary counts as one short line, skipping zeros.
export function summaryLine(counts) {
  if (!counts) return ''
  const parts = [
    [counts.overdue, 'overdue'],
    [counts.due_today, 'due today'],
    [counts.re_engage, 're-engage'],
    [counts.no_follow_up, 'no follow-up'],
  ]
  return parts
    .filter(([count]) => count)
    .map(([count, label]) => `${count} ${label}`)
    .join(' · ')
}

// Triage rows split by bucket, Call again by planned date then score.
export function splitTriage(rows) {
  const callAgain = []
  const suggestClose = []
  for (const row of rows || []) {
    if (row.bucket === 'Suggest close') suggestClose.push(row)
    else callAgain.push(row)
  }
  callAgain.sort(
    (a, b) =>
      String(a.follow_up_on || '9999').localeCompare(
        String(b.follow_up_on || '9999'),
      ) || (b.score || 0) - (a.score || 0),
  )
  return { callAgain, suggestClose }
}
