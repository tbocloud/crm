import {
  adjustmentChip,
  canRequest,
  canSeeApprovals,
  formatPercent,
  requestActions,
  requestStage,
} from '@/tbo/quotationApprovals/status'

const kind = (overrides = {}) => ({
  kind: 'Discount',
  percent: 8,
  limit: 5,
  limit_label: '5%',
  within_limit: false,
  approved: false,
  latest: null,
  ...overrides,
})

const adjustment = (overrides = {}) => ({
  name: 'QADJ-2026-00001',
  kind: 'Discount',
  status: 'Pending',
  voided: false,
  within_limit: false,
  requested_percent: 8,
  approved_percent: 0,
  current_level: 'BDM',
  can_approve_in_full: true,
  ...overrides,
})

const bdm = {
  enabled: true,
  level: { level: 'BDM', rank: 20 },
  limits: { Discount: 10, Commission: 4 },
  is_approver: true,
  can_forward: true,
  can_override: false,
  open_requests: 0,
}

describe('formatPercent', () => {
  it('drops trailing zeros', () => {
    expect(formatPercent(8)).toBe('8%')
    expect(formatPercent(7.5)).toBe('7.5%')
    expect(formatPercent('12.345')).toBe('12.35%')
    expect(formatPercent(null)).toBe('0%')
  })
})

describe('adjustmentChip', () => {
  it('shows who an open request waits for', () => {
    const chip = adjustmentChip(kind({ latest: adjustment() }))
    expect(chip).toEqual({ tone: 'info', label: 'Pending with BDM' })
  })

  it('ignores a voided request', () => {
    const latest = adjustment({ voided: true })
    expect(adjustmentChip(kind({ latest })).label).toBe('Needs approval')
  })

  it('shows the approved and overridden percent', () => {
    const approved = adjustment({ status: 'Approved', approved_percent: 7 })
    expect(adjustmentChip(kind({ approved: true, latest: approved }))).toEqual({
      tone: 'success',
      label: 'Approved 7%',
    })
    const overridden = adjustment({
      status: 'Overridden',
      approved_percent: 30,
    })
    expect(
      adjustmentChip(kind({ approved: true, latest: overridden })).label,
    ).toBe('Overridden 30%')
  })

  it('is within limit with nothing to approve', () => {
    expect(adjustmentChip(kind({ percent: 0, approved: true })).label).toBe(
      'Within limit',
    )
    expect(
      adjustmentChip(kind({ percent: 4, within_limit: true, approved: true }))
        .label,
    ).toBe('Within limit')
  })

  it('shows a rejection until the quotation changes', () => {
    const latest = adjustment({ status: 'Rejected' })
    expect(adjustmentChip(kind({ latest }))).toEqual({
      tone: 'danger',
      label: 'Rejected',
    })
  })

  it('treats a higher level applying within its own limit as approved', () => {
    const latest = adjustment({ status: 'Approved', within_limit: true })
    expect(adjustmentChip(kind({ approved: true, latest })).label).toBe(
      'Approved 8%',
    )
  })
})

describe('canRequest', () => {
  it('allows a draft above my limit with nothing open', () => {
    expect(canRequest(kind(), 0, bdm)).toBe(true)
  })

  it('refuses submitted, covered, within-limit or already-open quotations', () => {
    expect(canRequest(kind(), 1, bdm)).toBe(false)
    expect(canRequest(kind({ approved: true }), 0, bdm)).toBe(false)
    expect(canRequest(kind({ within_limit: true }), 0, bdm)).toBe(false)
    expect(canRequest(kind({ latest: adjustment() }), 0, bdm)).toBe(false)
    expect(canRequest(kind(), 0, { ...bdm, level: null })).toBe(false)
  })
})

describe('requestStage', () => {
  it('labels each state', () => {
    expect(requestStage(adjustment()).label).toBe('Pending with BDM')
    expect(requestStage(adjustment({ voided: true })).label).toBe('Voided')
    expect(
      requestStage(adjustment({ status: 'Approved', approved_percent: 7 }))
        .label,
    ).toBe('Approved 7%')
    expect(requestStage(adjustment({ status: 'Rejected' })).tone).toBe('danger')
  })
})

describe('requestActions', () => {
  it('lets an approver decide a request within their limit', () => {
    expect(requestActions(adjustment(), bdm, true)).toEqual({
      approve: { max: 8, default: 8 },
      reject: true,
      forward: true,
      override: false,
    })
  })

  it('caps approval at my limit above it, with no reject', () => {
    const row = adjustment({
      requested_percent: 18,
      can_approve_in_full: false,
    })
    expect(requestActions(row, bdm, true)).toEqual({
      approve: { max: 10, default: 10 },
      reject: false,
      forward: true,
      override: false,
    })
    const unset = { ...bdm, limits: { Discount: 0 } }
    expect(requestActions(row, unset, true).approve).toBeNull()
  })

  it('offers only override outside the waiting list, and only to the CEO', () => {
    const ceo = { ...bdm, can_override: true, can_forward: false }
    const rejected = adjustment({ status: 'Rejected' })
    expect(requestActions(rejected, ceo, false)).toEqual({
      approve: null,
      reject: false,
      forward: false,
      override: true,
    })
    expect(requestActions(rejected, bdm, false).override).toBe(false)
    expect(
      requestActions(adjustment({ voided: true }), ceo, true).override,
    ).toBe(false)
  })
})

describe('canSeeApprovals', () => {
  it('shows the page to approvers and to anyone waiting on a request', () => {
    expect(canSeeApprovals(bdm)).toBe(true)
    const bde = { ...bdm, is_approver: false }
    expect(canSeeApprovals(bde)).toBe(false)
    expect(canSeeApprovals({ ...bde, open_requests: 1 })).toBe(true)
    expect(canSeeApprovals({ ...bdm, enabled: false })).toBe(false)
    expect(canSeeApprovals(null)).toBe(false)
  })
})
