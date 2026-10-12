// Pure helpers for the quotation approval screens. The rules they mirror live in
// tbo_smart (docs/quotation-discount-control.md); the server re-checks every action.

export const OPEN_STATUSES = ['Pending', 'Escalated']
export const GRANTED_STATUSES = ['Approved', 'Overridden']

export function formatPercent(value) {
  const number = Number(value) || 0
  return `${Number(number.toFixed(2))}%`
}

function isOpen(adjustment) {
  return OPEN_STATUSES.includes(adjustment?.status)
}

function liveLatest(kindStatus) {
  const latest = kindStatus.latest
  return latest && !latest.voided ? latest : null
}

// The chip for one kind on a quotation, from get_quotation_adjustment_status.
// `tone` is neutral | info | success | warning | danger.
export function adjustmentChip(kindStatus) {
  const latest = liveLatest(kindStatus)
  if (isOpen(latest)) {
    return {
      tone: 'info',
      label: __('Pending with {0}', [latest.current_level]),
    }
  }
  if (kindStatus.percent <= 0) {
    return { tone: 'neutral', label: __('Within limit') }
  }
  const granted =
    latest && GRANTED_STATUSES.includes(latest.status) && !latest.within_limit
      ? latest
      : null
  if (granted && kindStatus.approved) {
    const percent = formatPercent(granted.approved_percent)
    return granted.status === 'Overridden'
      ? { tone: 'success', label: __('Overridden {0}', [percent]) }
      : { tone: 'success', label: __('Approved {0}', [percent]) }
  }
  if (kindStatus.within_limit) {
    return { tone: 'neutral', label: __('Within limit') }
  }
  if (kindStatus.approved) {
    return {
      tone: 'success',
      label: __('Approved {0}', [formatPercent(kindStatus.percent)]),
    }
  }
  if (latest?.status === 'Rejected') {
    return { tone: 'danger', label: __('Rejected') }
  }
  return { tone: 'warning', label: __('Needs approval') }
}

// Whether the session user may ask for approval of this kind: a draft above
// their limit, not yet covered, with nothing already waiting.
export function canRequest(kindStatus, docstatus, access) {
  return Boolean(
    access?.level &&
    docstatus === 0 &&
    kindStatus.percent > 0 &&
    !kindStatus.within_limit &&
    !kindStatus.approved &&
    !isOpen(liveLatest(kindStatus)),
  )
}

// Where a request stands, for the approvals list.
export function requestStage(adjustment) {
  if (adjustment.voided) return { tone: 'neutral', label: __('Voided') }
  if (isOpen(adjustment)) {
    return {
      tone: 'info',
      label: __('Pending with {0}', [adjustment.current_level]),
    }
  }
  const percent = formatPercent(adjustment.approved_percent)
  if (adjustment.status === 'Approved') {
    return { tone: 'success', label: __('Approved {0}', [percent]) }
  }
  if (adjustment.status === 'Overridden') {
    return { tone: 'success', label: __('Overridden {0}', [percent]) }
  }
  return { tone: 'danger', label: __('Rejected') }
}

// What the session user may do with a request, given get_adjustment_limits.
// `waiting` is true for rows from get_pending_approvals.
export function requestActions(adjustment, access, waiting) {
  const none = { approve: null, reject: false, forward: false, override: false }
  if (!access?.level || adjustment.voided) return none
  const override = Boolean(access.can_override)
  if (!waiting || !isOpen(adjustment)) return { ...none, override }

  const limit = access.limits?.[adjustment.kind]
  const requested = Number(adjustment.requested_percent) || 0
  let approve = null
  if (adjustment.can_approve_in_full) {
    approve = { max: requested, default: requested }
  } else if (limit > 0) {
    // above my limit: I may still grant up to my limit, or forward it
    const max = Math.min(limit, requested)
    approve = { max, default: max }
  }
  return {
    approve,
    reject: Boolean(adjustment.can_approve_in_full),
    forward: Boolean(access.can_forward),
    override,
  }
}

export function canSeeApprovals(access) {
  return Boolean(
    access?.enabled && (access.is_approver || access.open_requests > 0),
  )
}
