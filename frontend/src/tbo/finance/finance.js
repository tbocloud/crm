// Pure rules for the deal Finance tab, the New quotation dialog and the BDE
// conversion report. No Vue, no network: tested in tests/unit/tboFinance.test.js.

// Each stage of the strip is done, current or still to come. A blank stage
// (nothing post-sale yet) leaves every step to come.
export function stageSteps(stages, current) {
  const index = stages.indexOf(current)
  return stages.map((stage, i) => ({
    stage,
    state: index < 0 || i > index ? 'todo' : i === index ? 'current' : 'done',
  }))
}

// Today's date as YYYY-MM-DD in the browser's own time zone (toISOString would
// give the UTC date, a day off around midnight in KSA).
export function localToday(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100

// One dialog line: the rate after its discount and the line amount.
export function lineAmounts(row) {
  const listRate = Number(row.price_list_rate) || 0
  const discount = Number(row.discount_percentage) || 0
  const rate = round2(listRate * (1 - discount / 100))
  return { rate, amount: round2(rate * (Number(row.qty) || 0)) }
}

// Net total before taxes, as ERPNext computes it: line amounts, then the
// additional discount on their sum.
export function quotationNetTotal(items, additionalDiscount = 0) {
  const lines = items.reduce((sum, row) => sum + lineAmounts(row).amount, 0)
  return round2(lines * (1 - (Number(additionalDiscount) || 0) / 100))
}

// Field errors for the dialog, keyed by field ("items.0.qty"). The server
// checks the same rules; this only saves a round trip.
export function validateQuotation(form, today) {
  const errors = {}
  const percent = (value) => {
    const n = Number(value) || 0
    return n >= 0 && n <= 100
  }
  if (!form.items?.length) errors.items = __('Add at least one item.')
  ;(form.items || []).forEach((row, i) => {
    if (!row.item_code) errors[`items.${i}.item_code`] = __('Choose an item.')
    if (!(Number(row.qty) > 0))
      errors[`items.${i}.qty`] = __('Quantity must be more than 0.')
    if ((Number(row.price_list_rate) || 0) < 0)
      errors[`items.${i}.price_list_rate`] = __('Rate cannot be negative.')
    if (!percent(row.discount_percentage))
      errors[`items.${i}.discount_percentage`] = __('Use 0 to 100%.')
  })
  if (!percent(form.additional_discount_percentage))
    errors.additional_discount_percentage = __('Use 0 to 100%.')
  if (!percent(form.commission)) errors.commission = __('Use 0 to 100%.')
  if (form.valid_till && today && form.valid_till < today)
    errors.valid_till = __('Valid till cannot be in the past.')
  return errors
}

// The values save_quotation takes, from the dialog's form.
export function quotationPayload(form) {
  return {
    company: form.company,
    valid_till: form.valid_till || null,
    taxes_and_charges: form.taxes_and_charges || null,
    additional_discount_percentage:
      Number(form.additional_discount_percentage) || 0,
    commission: Number(form.commission) || 0,
    terms: form.terms || null,
    items: form.items.map((row) => ({
      item_code: row.item_code,
      qty: Number(row.qty) || 0,
      price_list_rate: Number(row.price_list_rate) || 0,
      discount_percentage: Number(row.discount_percentage) || 0,
    })),
  }
}

// Badge tone for ERPNext document statuses. Colour always comes with the
// status text, never on its own.
const STATUS_TONE = {
  Draft: 'gray',
  Open: 'blue',
  'To Deliver and Bill': 'blue',
  'To Bill': 'blue',
  'To Deliver': 'blue',
  Ordered: 'green',
  Completed: 'green',
  Paid: 'green',
  'Partly Paid': 'orange',
  Unpaid: 'orange',
  Overdue: 'red',
  'Partly Paid and Discounted': 'orange',
  Return: 'gray',
  'Credit Note Issued': 'gray',
  Lost: 'red',
  Expired: 'gray',
  Cancelled: 'red',
  Closed: 'gray',
  'On Hold': 'orange',
}
export function statusTone(status) {
  return STATUS_TONE[status] || 'gray'
}

// A term is overdue when it still has something outstanding past its due date.
export function isTermOverdue(term, today) {
  return (
    Number(term.outstanding) > 0.005 &&
    Boolean(term.due_date) &&
    term.due_date < today
  )
}

// True for a 403 from the server (frappe.PermissionError).
export function isPermissionError(error) {
  const type = error?.exc_type || error?.exception || ''
  return (
    String(type).includes('PermissionError') ||
    error?.response?.status === 403 ||
    error?.status === 403
  )
}

// Report rows sorted by a column; ties fall back to the name.
export function sortRows(rows, key, direction = 'desc') {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (typeof left === 'string' || typeof right === 'string') {
      return sign * String(left || '').localeCompare(String(right || ''))
    }
    const diff = (Number(left) || 0) - (Number(right) || 0)
    return diff
      ? sign * diff
      : String(a.full_name || '').localeCompare(String(b.full_name || ''))
  })
}

// Ageing buckets of the Receivables page, in order.
export const AGEING_BUCKETS = [
  { key: 'not_due', label: 'Not due' },
  { key: '0_30', label: '1-30 days' },
  { key: '31_60', label: '31-60 days' },
  { key: '61_90', label: '61-90 days' },
  { key: '90_plus', label: '90+ days' },
]

// What a user can ask for on an invoice, and the extra field each one needs.
export const EXCEPTION_REQUESTS = [
  {
    type: 'Extension request',
    label: 'Extend the due date',
    needs: 'new_due_date',
  },
  { type: 'Pause request', label: 'Pause reminders', needs: 'pause_until' },
  {
    type: 'Client dispute',
    label: 'Client dispute (pauses reminders)',
    needs: 'pause_until',
  },
  {
    type: 'Write-off request',
    label: 'Write off the balance',
    needs: 'resolution',
  },
]

// Field errors for the exception dialog.
export function validateExceptionRequest(form, today) {
  const errors = {}
  const request = EXCEPTION_REQUESTS.find(
    (row) => row.type === form.exception_type,
  )
  if (!request) errors.exception_type = __('Choose what you need.')
  if (!form.reason?.trim()) errors.reason = __('Give a reason.')
  if (request?.needs === 'new_due_date') {
    if (!form.new_due_date) errors.new_due_date = __('Choose the new due date.')
    else if (form.new_due_date < today)
      errors.new_due_date = __('The new due date cannot be in the past.')
  }
  if (request?.needs === 'pause_until') {
    if (!form.pause_until) errors.pause_until = __('Choose until when.')
    else if (form.pause_until < today)
      errors.pause_until = __('The date cannot be in the past.')
  }
  return errors
}

// Field errors for the follow-up dialog.
export function validateFollowUp(form, today) {
  const errors = {}
  if (!form.due_date) errors.due_date = __('Choose the next follow-up date.')
  if (form.promised_date && form.promised_date < today)
    errors.promised_date = __('The promised date cannot be in the past.')
  if (
    form.promised_amount !== '' &&
    form.promised_amount != null &&
    Number(form.promised_amount) < 0
  )
    errors.promised_amount = __('The amount cannot be negative.')
  return errors
}

// The receivables rows as CSV (Excel-friendly), for the Export button.
export function receivablesCsv(rows) {
  const header = [
    'Invoice',
    'Customer',
    'Company',
    'Currency',
    'Due date',
    'Outstanding',
    'Overdue',
    ...AGEING_BUCKETS.map((bucket) => bucket.label),
    'Deal owner',
    'Accounts owner',
    'Escalation level',
    'Last reminder',
    'Promised date',
    'Promised amount',
  ]
  const cell = (value) => {
    const text = value === null || value === undefined ? '' : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = rows.map((row) =>
    [
      row.invoice,
      row.customer_name,
      row.company,
      row.currency,
      row.due_date,
      row.outstanding,
      row.overdue,
      ...AGEING_BUCKETS.map((bucket) => row.buckets?.[bucket.key] ?? 0),
      row.deal_owner_name || row.deal_owner,
      row.accounts_owner_name || row.accounts_owner,
      row.escalation_level,
      row.last_reminder,
      row.promised_date,
      row.promised_amount,
    ]
      .map(cell)
      .join(','),
  )
  return [header.map(cell).join(','), ...lines].join('\n')
}

// Exception status → badge tone; colour always comes with the status text.
export function exceptionTone(status) {
  return (
    {
      Open: 'gray',
      'Pending Approval': 'orange',
      Approved: 'green',
      Rejected: 'red',
    }[status] || 'gray'
  )
}
