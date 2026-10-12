import {
  exceptionTone,
  receivablesCsv,
  validateExceptionRequest,
  validateFollowUp,
  isPermissionError,
  isTermOverdue,
  lineAmounts,
  localToday,
  quotationNetTotal,
  quotationPayload,
  sortRows,
  stageSteps,
  statusTone,
  validateQuotation,
} from '@/tbo/finance/finance'

const STAGES = [
  'Onboarding',
  'Quotation',
  'Invoiced',
  'Collecting',
  'Collected',
  'Closed',
]

describe('stageSteps', () => {
  it('marks earlier stages done and the current one current', () => {
    expect(stageSteps(STAGES, 'Invoiced').map((s) => s.state)).toEqual([
      'done',
      'done',
      'current',
      'todo',
      'todo',
      'todo',
    ])
  })

  it('leaves everything to come when nothing is post-sale yet', () => {
    expect(stageSteps(STAGES, '').every((s) => s.state === 'todo')).toBe(true)
  })
})

describe('quotation amounts', () => {
  it('applies the line discount', () => {
    expect(
      lineAmounts({ qty: 2, price_list_rate: 500, discount_percentage: 10 }),
    ).toEqual({
      rate: 450,
      amount: 900,
    })
  })

  it('applies the additional discount on the sum of lines', () => {
    const items = [
      { qty: 2, price_list_rate: 500, discount_percentage: 10 },
      { qty: 1, price_list_rate: 100, discount_percentage: 0 },
    ]
    expect(quotationNetTotal(items, 10)).toBe(900)
  })

  it('treats blanks as zero', () => {
    expect(lineAmounts({ qty: '', price_list_rate: '' })).toEqual({
      rate: 0,
      amount: 0,
    })
  })
})

describe('validateQuotation', () => {
  const valid = {
    items: [
      { item_code: 'SVC', qty: 1, price_list_rate: 10, discount_percentage: 0 },
    ],
    additional_discount_percentage: 0,
    commission: 0,
    valid_till: '2026-11-01',
  }

  it('accepts a complete form', () => {
    expect(validateQuotation(valid, '2026-10-12')).toEqual({})
  })

  it('reports each problem on its field', () => {
    const errors = validateQuotation(
      {
        items: [
          {
            item_code: '',
            qty: 0,
            price_list_rate: -1,
            discount_percentage: 120,
          },
        ],
        additional_discount_percentage: 101,
        commission: -1,
        valid_till: '2026-10-01',
      },
      '2026-10-12',
    )
    expect(Object.keys(errors).sort()).toEqual([
      'additional_discount_percentage',
      'commission',
      'items.0.discount_percentage',
      'items.0.item_code',
      'items.0.price_list_rate',
      'items.0.qty',
      'valid_till',
    ])
  })

  it('needs at least one item', () => {
    expect(
      validateQuotation({ ...valid, items: [] }, '2026-10-12').items,
    ).toBeTruthy()
  })
})

describe('quotationPayload', () => {
  it('sends numbers and drops the row keys', () => {
    const payload = quotationPayload({
      company: 'TBO KSA',
      valid_till: '',
      taxes_and_charges: '',
      additional_discount_percentage: '5',
      commission: '',
      terms: '',
      items: [
        {
          key: 3,
          item_code: 'SVC',
          item_name: 'Service',
          qty: '2',
          price_list_rate: '10',
          discount_percentage: '',
        },
      ],
    })
    expect(payload).toEqual({
      company: 'TBO KSA',
      valid_till: null,
      taxes_and_charges: null,
      additional_discount_percentage: 5,
      commission: 0,
      terms: null,
      items: [
        {
          item_code: 'SVC',
          qty: 2,
          price_list_rate: 10,
          discount_percentage: 0,
        },
      ],
    })
  })
})

describe('helpers', () => {
  it('maps statuses to tones with a neutral fallback', () => {
    expect(statusTone('Overdue')).toBe('red')
    expect(statusTone('Paid')).toBe('green')
    expect(statusTone('Something new')).toBe('gray')
  })

  it('flags open terms past their due date', () => {
    expect(
      isTermOverdue({ outstanding: 10, due_date: '2026-10-01' }, '2026-10-12'),
    ).toBe(true)
    expect(
      isTermOverdue({ outstanding: 0, due_date: '2026-10-01' }, '2026-10-12'),
    ).toBe(false)
    expect(
      isTermOverdue({ outstanding: 10, due_date: '2026-10-20' }, '2026-10-12'),
    ).toBe(false)
  })

  it('recognises a 403', () => {
    expect(isPermissionError({ exc_type: 'PermissionError' })).toBe(true)
    expect(isPermissionError({ status: 403 })).toBe(true)
    expect(isPermissionError({ exc_type: 'ValidationError' })).toBe(false)
  })

  it('sorts report rows with the name as tie-break', () => {
    const rows = [
      { full_name: 'B', won: 1 },
      { full_name: 'A', won: 1 },
      { full_name: 'C', won: 3 },
    ]
    expect(sortRows(rows, 'won').map((r) => r.full_name)).toEqual([
      'C',
      'A',
      'B',
    ])
    expect(sortRows(rows, 'full_name', 'asc').map((r) => r.full_name)).toEqual([
      'A',
      'B',
      'C',
    ])
  })
})

describe('localToday', () => {
  it('uses the local calendar date', () => {
    expect(localToday(new Date(2026, 9, 12, 0, 30))).toBe('2026-10-12')
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('receivables helpers', () => {
  it('checks an exception request per type', () => {
    const today = '2026-10-12'
    expect(
      validateExceptionRequest(
        {
          exception_type: 'Extension request',
          reason: 'x',
          new_due_date: '2026-10-20',
        },
        today,
      ),
    ).toEqual({})
    expect(
      Object.keys(
        validateExceptionRequest(
          { exception_type: 'Extension request', reason: '' },
          today,
        ),
      ).sort(),
    ).toEqual(['new_due_date', 'reason'])
    expect(
      validateExceptionRequest(
        {
          exception_type: 'Client dispute',
          reason: 'x',
          pause_until: '2026-10-01',
        },
        today,
      ).pause_until,
    ).toBeTruthy()
    expect(
      validateExceptionRequest(
        { exception_type: 'Write-off request', reason: 'x' },
        today,
      ),
    ).toEqual({})
    expect(
      validateExceptionRequest({ exception_type: 'Other', reason: 'x' }, today)
        .exception_type,
    ).toBeTruthy()
  })

  it('checks a follow-up', () => {
    expect(
      validateFollowUp(
        { due_date: '2026-10-13', promised_amount: '' },
        '2026-10-12',
      ),
    ).toEqual({})
    expect(
      Object.keys(
        validateFollowUp(
          { due_date: '', promised_date: '2026-10-01', promised_amount: -5 },
          '2026-10-12',
        ),
      ).sort(),
    ).toEqual(['due_date', 'promised_amount', 'promised_date'])
  })

  it('exports receivables as CSV with quoting', () => {
    const csv = receivablesCsv([
      {
        invoice: 'SINV-1',
        customer_name: 'Acme, "Trading"',
        company: 'TBO KSA',
        currency: 'SAR',
        due_date: '2026-10-01',
        outstanding: 100,
        overdue: 100,
        buckets: { '0_30': 100 },
        escalation_level: 2,
      },
    ])
    const [header, line] = csv.split('\n')
    expect(header.startsWith('Invoice,Customer')).toBe(true)
    expect(line).toContain('"Acme, ""Trading"""')
    expect(line.split(',').length).toBeGreaterThan(10)
  })

  it('neutralises formula cells but keeps numbers', () => {
    const csv = receivablesCsv([
      {
        invoice: 'SINV-2',
        customer_name: '=HYPERLINK("x")',
        company: '@corp',
        currency: 'SAR',
        outstanding: -5,
        overdue: 0,
        buckets: {},
      },
    ])
    const line = csv.split('\n')[1]
    expect(line).toContain(`"'=HYPERLINK(""x"")"`)
    expect(line).toContain("'@corp")
    expect(line).toContain(',-5,')
  })

  it('gives each exception status a tone', () => {
    expect(exceptionTone('Pending Approval')).toBe('orange')
    expect(exceptionTone('Approved')).toBe('green')
    expect(exceptionTone('Unknown')).toBe('gray')
  })
})
