import {
  joinDateTime,
  linkLabel,
  meetingActions,
  meetingTone,
  reminderMinutes,
  mergeDraft,
  momPayload,
  schedulePayload,
  splitDateTime,
  validateMom,
  validateSchedule,
} from '@/tbo/leadPipeline/pipeline'

const NOW = '2026-10-16 10:00:00'

describe('meetingTone', () => {
  it('colours only what means something, always with an icon', () => {
    expect(meetingTone('MOM Submitted')).toEqual({
      tone: 'success',
      icon: 'check',
    })
    expect(meetingTone('MOM Pending')).toEqual({
      tone: 'danger',
      icon: 'alert',
    })
    expect(meetingTone('Scheduled').tone).toBe('info')
    expect(meetingTone('Cancelled')).toEqual({ tone: 'neutral', icon: 'x' })
    expect(meetingTone('Completed').tone).toBe('neutral')
  })
})

describe('meetingActions', () => {
  it('offers nothing on a final meeting or without write', () => {
    const none = {
      mom: false,
      reschedule: false,
      cancel: false,
      followUp: false,
    }
    expect(meetingActions({ status: 'MOM Submitted' }, true)).toEqual(none)
    expect(meetingActions({ status: 'Cancelled' }, true)).toEqual(none)
    expect(meetingActions({ status: 'Scheduled' }, false)).toEqual(none)
  })
  it('lets the BDE write the MOM of a pending meeting', () => {
    expect(meetingActions({ status: 'MOM Pending' }, true).mom).toBe(true)
    const later = { status: 'Scheduled', scheduled_at: '2026-10-20 10:00:00' }
    expect(meetingActions(later, true, NOW).mom).toBe(false)
    expect(
      meetingActions(
        { ...later, scheduled_at: '2026-10-16 09:00:00' },
        true,
        NOW,
      ).mom,
    ).toBe(true)
    expect(
      meetingActions({ status: 'Follow-up Required' }, true).followUp,
    ).toBe(false)
  })
})

describe('linkLabel', () => {
  it('names Meet and Teams links', () => {
    expect(linkLabel('https://meet.google.com/abc-defg-hij')).toBe(
      'Google Meet',
    )
    expect(linkLabel('https://teams.microsoft.com/l/meetup-join/x')).toBe(
      'Microsoft Teams',
    )
    expect(linkLabel('https://www.zoom.us/j/1')).toBe('zoom.us')
    expect(linkLabel('not a link')).toBe('')
  })
})

describe('reminderMinutes', () => {
  it('takes whole minutes from 15 to 1,440', () => {
    expect(reminderMinutes('60')).toBe(60)
    expect(reminderMinutes(15)).toBe(15)
    expect(reminderMinutes('')).toBeNull()
    expect(reminderMinutes(10)).toBeNull()
    expect(reminderMinutes(30.5)).toBeNull()
  })
})

describe('date and time', () => {
  it('splits and joins', () => {
    expect(splitDateTime('2026-10-17 11:30:00')).toEqual({
      date: '2026-10-17',
      time: '11:30',
    })
    expect(splitDateTime(null)).toEqual({ date: '', time: '' })
    expect(joinDateTime('2026-10-17', '11:30')).toBe('2026-10-17 11:30:00')
    expect(joinDateTime('2026-10-17', '')).toBe('')
  })
})

describe('validateSchedule', () => {
  const base = {
    meeting_type: 'Online',
    date: '2026-10-17',
    time: '11:00',
    duration_minutes: 60,
  }
  it('accepts a future online meeting with or without a link', () => {
    expect(validateSchedule(base, NOW)).toEqual({})
    expect(
      validateSchedule(
        { ...base, meeting_link: 'https://meet.google.com/x' },
        NOW,
      ),
    ).toEqual({})
  })
  it('refuses the past, a bare link and a silly duration', () => {
    expect(
      validateSchedule({ ...base, date: '2026-10-15' }, NOW).when,
    ).toBeTruthy()
    expect(validateSchedule({ ...base, date: '' }, NOW).when).toBe(
      'Choose the date and time.',
    )
    expect(
      validateSchedule({ ...base, meeting_link: 'meet.google.com/x' }, NOW)
        .meeting_link,
    ).toBeTruthy()
    expect(
      validateSchedule({ ...base, duration_minutes: 2 }, NOW).duration_minutes,
    ).toBeTruthy()
  })
})

describe('schedulePayload', () => {
  it('keeps the link for online and the place for a visit', () => {
    const online = schedulePayload({
      meeting_type: 'Online',
      date: '2026-10-17',
      time: '11:00',
      meeting_link: ' https://meet.google.com/x ',
      location: 'Kochi',
      duration_minutes: '45',
    })
    expect(online).toMatchObject({
      scheduled_at: '2026-10-17 11:00:00',
      meeting_link: 'https://meet.google.com/x',
      location: null,
      duration_minutes: 45,
    })
    const visit = schedulePayload({
      meeting_type: 'Physical visit',
      date: '2026-10-17',
      time: '11:00',
      location: 'Kochi',
      meeting_link: 'x',
    })
    expect(visit).toMatchObject({ meeting_link: null, location: 'Kochi' })
  })
})

describe('validateMom', () => {
  const today = '2026-10-16'
  it('needs only a sane date to save a draft', () => {
    expect(validateMom({}, today, { submit: false })).toEqual({})
    expect(
      validateMom({ next_follow_up_on: '2026-10-01' }, today, { submit: false })
        .next_follow_up_on,
    ).toBeTruthy()
  })
  it('needs the discussion and a next step to submit', () => {
    const errors = validateMom({}, today, { submit: true })
    expect(Object.keys(errors).sort()).toEqual([
      'discussion_points',
      'next_follow_up_on',
    ])
    expect(
      validateMom({ discussion_points: 'x' }, today, {
        submit: true,
        nextMeeting: true,
      }),
    ).toEqual({})
    expect(
      validateMom({ discussion_points: 'x' }, today, {
        submit: true,
        closing: true,
      }),
    ).toEqual({})
    expect(
      validateMom({ discussion_points: 'x' }, today, {
        submit: true,
        closing: true,
        lost: true,
      }).lost_reason,
    ).toBeTruthy()
  })
})

describe('momPayload and mergeDraft', () => {
  it('drops empty action rows and trims', () => {
    const payload = momPayload({
      discussion_points: ' Billing ',
      action_items: [
        { item: ' Send prices ', responsible: '', done: true },
        { item: ' ' },
      ],
    })
    expect(payload.discussion_points).toBe('Billing')
    expect(payload.agenda).toBeNull()
    expect(payload.action_items).toEqual([
      { item: 'Send prices', responsible: null, due_date: null, done: 1 },
    ])
  })
  it('fills only what the AI wrote and keeps typed rows', () => {
    const merged = mergeDraft(
      {
        agenda: 'Mine',
        decisions: 'Typed',
        action_items: [{ item: 'Typed row' }],
      },
      {
        fields: { agenda: 'AI agenda', discussion_points: 'AI points' },
        action_items: [{ item: 'AI row' }],
      },
    )
    expect(merged.agenda).toBe('AI agenda')
    expect(merged.decisions).toBe('Typed')
    expect(merged.discussion_points).toBe('AI points')
    expect(merged.action_items.map((row) => row.item)).toEqual([
      'Typed row',
      'AI row',
    ])
  })
})
