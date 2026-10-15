import {
  bandStyle,
  datePart,
  daysAgo,
  followUpError,
  normalisePhone,
  notePayload,
  splitTriage,
  summaryLine,
  telLink,
  whatsappLink,
} from '@/tbo/smartLeads/smartLeads'

describe('normalisePhone', () => {
  it('adds +91 to ten digits and drops a trunk 0', () => {
    expect(normalisePhone('98470 12345')).toBe('919847012345')
    expect(normalisePhone('098470-12345')).toBe('919847012345')
    expect(normalisePhone('+91 98470 12345')).toBe('919847012345')
  })
  it('keeps international numbers', () => {
    expect(normalisePhone('+971 50 418 2276')).toBe('971504182276')
    expect(normalisePhone('00971504182276')).toBe('971504182276')
  })
  it('refuses what cannot be dialled', () => {
    for (const value of [null, '', '12345', 'call me']) {
      expect(normalisePhone(value)).toBeNull()
    }
  })
})

describe('links', () => {
  it('builds wa.me and tel links', () => {
    expect(whatsappLink('9847012345')).toBe('https://wa.me/919847012345')
    expect(whatsappLink('9847012345', 'Hello Ajith, demo?')).toBe(
      'https://wa.me/919847012345?text=Hello%20Ajith%2C%20demo%3F',
    )
    expect(telLink('9847012345')).toBe('tel:+919847012345')
    expect(whatsappLink('abc')).toBeNull()
  })
})

describe('bandStyle', () => {
  it('gives each band a status colour and falls back to Cold', () => {
    expect(bandStyle('Hot').tone).toBe('danger')
    expect(bandStyle('Warm').tone).toBe('warning')
    expect(bandStyle('Cold').tone).toBe('gray')
    expect(bandStyle(undefined).tone).toBe('gray')
  })
})

describe('dates', () => {
  it('formats days ago and date parts', () => {
    expect(daysAgo(0)).toBe('today')
    expect(daysAgo(1)).toBe('yesterday')
    expect(daysAgo(6)).toBe('6 days ago')
    expect(daysAgo(null)).toBe('')
    expect(datePart('2026-10-15 10:00:00')).toBe('2026-10-15')
  })
  it('checks a next follow-up date', () => {
    expect(followUpError('', '2026-10-15')).toBe('Pick a date.')
    expect(followUpError('15-10-2026', '2026-10-15')).toBe('Use a full date.')
    expect(followUpError('2026-10-14', '2026-10-15')).toMatch(/past/)
    expect(followUpError('2026-10-15', '2026-10-15')).toBe('')
  })
})

describe('notePayload', () => {
  it('sends the confirmed proposal, trimmed', () => {
    expect(
      notePayload('LEAD-1', {
        note: '  Called Ajith ',
        kind: 'call',
        next_status: 'Contacted',
        follow_up_on: '2026-10-20',
        follow_up_reason: ' Demo ',
      }),
    ).toEqual({
      lead: 'LEAD-1',
      text: 'Called Ajith',
      kind: 'call',
      status: 'Contacted',
      follow_up_on: '2026-10-20',
      follow_up_reason: 'Demo',
    })
    expect(notePayload('LEAD-1', { note: 'x', kind: 'meeting' })).toMatchObject(
      {
        kind: 'note',
        status: null,
        follow_up_on: null,
        follow_up_reason: null,
      },
    )
  })
})

describe('summaryLine', () => {
  it('skips zero counts', () => {
    expect(
      summaryLine({ overdue: 2, due_today: 0, re_engage: 1, no_follow_up: 40 }),
    ).toBe('2 overdue · 1 re-engage · 40 no follow-up')
    expect(summaryLine(null)).toBe('')
  })
})

describe('splitTriage', () => {
  it('splits by bucket and orders Call again by date then score', () => {
    const { callAgain, suggestClose } = splitTriage([
      {
        lead: 'a',
        bucket: 'Call again',
        follow_up_on: '2026-10-17',
        score: 10,
      },
      { lead: 'b', bucket: 'Suggest close' },
      { lead: 'c', bucket: 'Call again', follow_up_on: '2026-10-16', score: 5 },
      {
        lead: 'd',
        bucket: 'Call again',
        follow_up_on: '2026-10-16',
        score: 40,
      },
      { lead: 'e', bucket: 'Call again', follow_up_on: null, score: 90 },
    ])
    expect(callAgain.map((row) => row.lead)).toEqual(['d', 'c', 'a', 'e'])
    expect(suggestClose.map((row) => row.lead)).toEqual(['b'])
  })
})
