// The CRM side of tbo_smart's lead pipeline (docs/tbo-lead-pipeline.md). Every
// call goes to tbo_smart, which checks the switch and CRM's own permissions.
// When tbo_smart is missing or the pipeline is off, the access call fails or
// says disabled, and the lead page stays as it was.
import { call, createResource } from 'frappe-ui'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { globalStore } from '@/stores/global'
import { load } from '@/tbo/quotationApprovals/api'

export { errorMessage, load } from '@/tbo/quotationApprovals/api'

const API = 'tbo_smart.api.lead_pipeline'
const SETTINGS_API = 'tbo_smart.api.lead_pipeline_settings'

export const methods = {
  access: `${API}.get_access`,
  lead: `${API}.get_lead_pipeline`,
  meeting: `${API}.get_meeting`,
  schedule: `${API}.schedule_meeting`,
  update: `${API}.update_meeting`,
  setStatus: `${API}.set_meeting_status`,
  saveMom: `${API}.save_mom`,
  draftMom: `${API}.draft_mom`,
  settings: `${SETTINGS_API}.get_settings`,
  saveSettings: `${SETTINGS_API}.save_settings`,
}

let accessResource

// Whether the pipeline is on; one shared resource for the lead page and tabs.
export function useLeadPipelineAccess() {
  if (!accessResource) {
    accessResource = createResource({
      url: methods.access,
      cache: 'tbo-lead-pipeline-access',
    })
    load(accessResource)
  }
  const access = computed(() =>
    accessResource.error ? null : accessResource.data || null,
  )
  return {
    resource: accessResource,
    access,
    enabled: computed(() => Boolean(access.value?.enabled)),
  }
}

export const refreshAccess = () => accessResource && load(accessResource)

export const scheduleMeeting = (lead, values) =>
  call(methods.schedule, { lead, values: JSON.stringify(values) })
export const updateMeeting = (meeting, values) =>
  call(methods.update, { meeting, values: JSON.stringify(values) })
export const setMeetingStatus = (meeting, status) =>
  call(methods.setStatus, { meeting, status })
export const saveMom = ({
  meeting,
  values,
  submit,
  leadStatus,
  lostReason,
  nextMeeting,
}) =>
  call(methods.saveMom, {
    meeting,
    values: JSON.stringify(values),
    submit: submit ? 1 : 0,
    lead_status: leadStatus || null,
    lost_reason: lostReason || null,
    next_meeting: nextMeeting ? JSON.stringify(nextMeeting) : null,
  })
export const draftMom = (meeting, notes) =>
  call(methods.draftMom, { meeting, notes })
export const savePipelineSettings = (values) =>
  call(methods.saveSettings, { values: JSON.stringify(values) })

// Reload when tbo_smart says the lead's meetings changed, and on focus.
export function useLeadPipelineRefresh(lead, reload) {
  const { $socket } = globalStore()
  const debounced = useDebounceFn(reload, 300)
  function onUpdate(data) {
    if (data?.lead === lead()) debounced()
  }
  onMounted(() => $socket?.on('tbo_lead_pipeline_update', onUpdate))
  onBeforeUnmount(() => $socket?.off('tbo_lead_pipeline_update', onUpdate))
  useEventListener(window, 'focus', () => debounced())
  return debounced
}
