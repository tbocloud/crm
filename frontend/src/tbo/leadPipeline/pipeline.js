// Pure rules of the lead pipeline screens (docs/tbo-lead-pipeline.md). The
// server decides and checks everything; these only shape the UI. Tested in
// tests/unit/tboLeadPipeline.test.js.

export const MEETING_STATUS = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'Meeting in Progress',
  COMPLETED: 'Completed',
  MOM_PENDING: 'MOM Pending',
  MOM_SUBMITTED: 'MOM Submitted',
  FOLLOW_UP_REQUIRED: 'Follow-up Required',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
}

const FINAL = [MEETING_STATUS.MOM_SUBMITTED, MEETING_STATUS.CANCELLED]
const UPCOMING = [MEETING_STATUS.SCHEDULED, MEETING_STATUS.RESCHEDULED]

// Colour only where it means something (done, overdue, a time coming up),
// always with an icon and the status text.
export function meetingTone(status) {
  switch (status) {
    case MEETING_STATUS.MOM_SUBMITTED:
      return { tone: 'success', icon: 'check' }
    case MEETING_STATUS.MOM_PENDING:
      return { tone: 'danger', icon: 'alert' }
    case MEETING_STATUS.FOLLOW_UP_REQUIRED:
      return { tone: 'warning', icon: 'alert' }
    case MEETING_STATUS.SCHEDULED:
    case MEETING_STATUS.RESCHEDULED:
    case MEETING_STATUS.IN_PROGRESS:
      return { tone: 'info', icon: 'clock' }
    default:
      return { tone: 'neutral', icon: status === 'Cancelled' ? 'x' : 'dot' }
  }
}

export const isFinal = (status) => FINAL.includes(status)
export const isUpcoming = (status) => UPCOMING.includes(status)

// What a person can do with a meeting card, by its status. Minutes come only
// once the meeting has started (`now` as localNow()).
export function meetingActions(meeting, canWrite, now = '') {
  if (!canWrite || isFinal(meeting.status)) {
    return { mom: false, reschedule: false, cancel: false, followUp: false }
  }
  return {
    mom: !(isUpcoming(meeting.status) && String(meeting.scheduled_at) > now),
    reschedule: true,
    cancel: true,
    followUp: meeting.status !== MEETING_STATUS.FOLLOW_UP_REQUIRED,
  }
}

// "Google Meet", "Microsoft Teams" or the link's host, for the join button.
export function linkLabel(url) {
  let host
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
  if (host === 'meet.google.com') return 'Google Meet'
  if (host.endsWith('teams.microsoft.com') || host.endsWith('teams.live.com'))
    return 'Microsoft Teams'
  return host.replace(/^www\./, '')
}

const pad = (n) => String(n).padStart(2, '0')

// "YYYY-MM-DD" and "HH:MM" in the browser's time, for date and time inputs.
export function splitDateTime(value) {
  if (!value) return { date: '', time: '' }
  const [date, time = ''] = String(value).split(' ')
  return { date, time: time.slice(0, 5) }
}

export function joinDateTime(date, time) {
  return date && time ? `${date} ${time}:00` : ''
}

export function localNow(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`
}

// Errors keyed by field for the schedule dialog; empty when it can be sent.
export function validateSchedule(values, now, { reschedule = false } = {}) {
  const errors = {}
  const at = joinDateTime(values.date, values.time)
  if (!at) errors.when = 'Choose the date and time.'
  else if (at < now)
    errors.when = reschedule
      ? 'Choose a time in the future to reschedule.'
      : "A new meeting can't be in the past."
  if (values.meeting_type === 'Online') {
    const link = (values.meeting_link || '').trim()
    if (link && !/^https:\/\/[^\s/]+/i.test(link))
      errors.meeting_link =
        'Paste the full https:// link of the Google Meet or Teams meeting.'
  }
  const duration = Number(values.duration_minutes)
  if (!(duration >= 5 && duration <= 720))
    errors.duration_minutes = 'Between 5 minutes and 12 hours.'
  return errors
}

export function schedulePayload(values) {
  const online = values.meeting_type === 'Online'
  return {
    scheduled_at: joinDateTime(values.date, values.time),
    meeting_type: values.meeting_type,
    meeting_link: online ? (values.meeting_link || '').trim() || null : null,
    location: online ? null : (values.location || '').trim() || null,
    duration_minutes: Number(values.duration_minutes) || 60,
    participants: (values.participants || '').trim() || null,
    agenda: (values.agenda || '').trim() || null,
  }
}

export const MOM_TEXT_FIELDS = [
  'agenda',
  'discussion_points',
  'client_requirements',
  'decisions',
  'objections',
  'quotation_feedback',
  'next_meeting_details',
]

// Errors for the MOM form. Submitting needs the discussion and a next step: a
// follow-up date, the next meeting, or the lead closing (Lost needs a reason).
export function validateMom(
  values,
  today,
  { submit, closing, lost, nextMeeting },
) {
  const errors = {}
  if (values.next_follow_up_on && values.next_follow_up_on < today)
    errors.next_follow_up_on = "The next follow-up can't be in the past."
  if (!submit) return errors
  if (!(values.discussion_points || '').trim())
    errors.discussion_points = 'Write the key discussion points.'
  if (!values.next_follow_up_on && !nextMeeting && !closing)
    errors.next_follow_up_on =
      'Set the next follow-up date or schedule the next meeting.'
  if (lost && !(values.lost_reason || '').trim())
    errors.lost_reason = 'Give a reason for losing the lead.'
  return errors
}

export function momPayload(values) {
  const payload = {}
  for (const field of MOM_TEXT_FIELDS)
    payload[field] = (values[field] || '').trim() || null
  payload.client_interest = values.client_interest || null
  payload.next_follow_up_on = values.next_follow_up_on || null
  payload.action_items = (values.action_items || [])
    .filter((row) => (row.item || '').trim())
    .map((row) => ({
      item: row.item.trim(),
      responsible: (row.responsible || '').trim() || null,
      due_date: row.due_date || null,
      done: row.done ? 1 : 0,
    }))
  return payload
}

// Merge an AI draft into the form: only fields the AI filled, never wiping
// what the person already typed in a field the AI left empty.
export function mergeDraft(values, draft) {
  const merged = { ...values }
  for (const [field, value] of Object.entries(draft?.fields || {})) {
    if (value) merged[field] = value
  }
  if (draft?.action_items?.length) {
    merged.action_items = [
      ...(values.action_items || []).filter((row) => (row.item || '').trim()),
      ...draft.action_items.map((row) => ({ ...row, done: 0 })),
    ]
  }
  return merged
}
