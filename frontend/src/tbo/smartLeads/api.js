// The CRM side of tbo_smart's smart leads (docs/tbo-smart-leads.md). Every
// call goes to tbo_smart, which checks the switches and CRM's permissions.
// When tbo_smart is missing or every switch is off, the access call fails or
// says disabled and nothing here shows.
import { call, createResource } from 'frappe-ui'
import { computed } from 'vue'
import { load } from '@/tbo/quotationApprovals/api'

export { errorMessage, load } from '@/tbo/quotationApprovals/api'

const API = 'tbo_smart.api.smart_leads'
const SETTINGS_API = 'tbo_smart.api.smart_leads_settings'

export const methods = {
  access: `${API}.get_access`,
  callToday: `${API}.get_call_today`,
  people: `${API}.get_people`,
  summary: `${API}.get_follow_up_summary`,
  needsOwner: `${API}.get_needs_owner`,
  reassign: `${API}.reassign_leads`,
  insight: `${API}.get_lead_insight`,
  refreshBrief: `${API}.refresh_brief`,
  draftNote: `${API}.draft_note`,
  saveNote: `${API}.save_note`,
  draftWhatsapp: `${API}.draft_whatsapp`,
  setFollowUp: `${API}.set_follow_up`,
  setStatus: `${API}.set_status`,
  triage: `${API}.get_triage`,
  startTriage: `${API}.start_triage`,
  applyTriage: `${API}.apply_triage`,
  closeTriage: `${API}.close_triage_leads`,
  settings: `${SETTINGS_API}.get_settings`,
  saveSettings: `${SETTINGS_API}.save_settings`,
  testConnection: `${SETTINGS_API}.test_connection`,
  testDigest: `${SETTINGS_API}.send_test_digest`,
}

let accessResource

// Which smart lead features are on and what I may do; one shared resource.
export function useSmartLeadsAccess() {
  if (!accessResource) {
    accessResource = createResource({
      url: methods.access,
      cache: 'tbo-smart-leads-access',
    })
    load(accessResource)
  }
  const access = computed(() =>
    accessResource.error ? null : accessResource.data || null,
  )
  return {
    resource: accessResource,
    access,
    loading: computed(() => accessResource.loading && !accessResource.data),
    enabled: computed(() => Boolean(access.value?.enabled)),
  }
}

export const refreshAccess = () => accessResource && load(accessResource)

export const draftNote = (lead, text) => call(methods.draftNote, { lead, text })
export const saveNote = (payload) => call(methods.saveNote, payload)
export const refreshBrief = (lead) => call(methods.refreshBrief, { lead })
export const draftWhatsapp = (lead, language) =>
  call(methods.draftWhatsapp, { lead, language })
export const setFollowUp = (lead, due, title) =>
  call(methods.setFollowUp, { lead, due, title: title || null })
export const setStatus = (lead, status) =>
  call(methods.setStatus, { lead, status })
export const reassignLeads = (leads, user) =>
  call(methods.reassign, { leads: JSON.stringify(leads), user })
export const startTriage = () => call(methods.startTriage)
export const applyTriage = (run) => call(methods.applyTriage, { run })
export const closeTriageLeads = (run, leads, status) =>
  call(methods.closeTriage, { run, leads: JSON.stringify(leads), status })
export const saveSettings = (values) =>
  call(methods.saveSettings, { values: JSON.stringify(values) })
export const testConnection = (provider) =>
  call(methods.testConnection, { provider })
export const sendTestDigest = () => call(methods.testDigest)
