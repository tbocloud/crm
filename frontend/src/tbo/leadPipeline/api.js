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
let lastAccessAttempt = 0
const ACCESS_RETRY_MS = 30000

// Whether the pipeline is on; one shared resource for the lead page and tabs.
// A failed check (network, deploy in progress) is retried by the next screen
// that asks, at most every 30 s, as the finance access does.
export function useLeadPipelineAccess() {
  if (!accessResource) {
    accessResource = createResource({
      url: methods.access,
      cache: 'tbo-lead-pipeline-access',
    })
    lastAccessAttempt = Date.now()
    load(accessResource)
  } else if (
    accessResource.error &&
    !accessResource.loading &&
    Date.now() - lastAccessAttempt > ACCESS_RETRY_MS
  ) {
    lastAccessAttempt = Date.now()
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

// Quotations on the lead (tbo_smart.api.lead_quotation)
const QUOTE_API = 'tbo_smart.api.lead_quotation'
export const leadQuotationMethods = {
  access: `${QUOTE_API}.get_access`,
  list: `${QUOTE_API}.get_lead_quotations`,
  form: `${QUOTE_API}.get_quotation_form`,
  save: `${QUOTE_API}.save_quotation`,
  markSent: `${QUOTE_API}.mark_sent`,
  setStatus: `${QUOTE_API}.set_quote_status`,
  revise: `${QUOTE_API}.create_revision`,
  revisions: `${QUOTE_API}.get_revisions`,
  savePdf: `${QUOTE_API}.save_pdf`,
  salesOrder: `${QUOTE_API}.make_sales_order`,
  catalogue: `${QUOTE_API}.get_catalogue`,
  savePackage: `${QUOTE_API}.save_package`,
  setRate: `${QUOTE_API}.set_service_rate`,
}

let quoteAccessResource

// Whether quotations on the lead are on, and what I may do there.
export function useLeadQuotationAccess() {
  if (!quoteAccessResource) {
    quoteAccessResource = createResource({
      url: leadQuotationMethods.access,
      cache: 'tbo-lead-quotation-access',
    })
    load(quoteAccessResource)
  }
  const access = computed(() =>
    quoteAccessResource.error ? null : quoteAccessResource.data || null,
  )
  return {
    resource: quoteAccessResource,
    access,
    enabled: computed(() => Boolean(access.value?.enabled)),
  }
}

export const refreshQuotationAccess = () =>
  quoteAccessResource && load(quoteAccessResource)

export const saveLeadQuotation = (lead, values, quotation) =>
  call(leadQuotationMethods.save, {
    lead,
    quotation: quotation || null,
    values: JSON.stringify(values),
  })
export const markQuotationSent = (args) =>
  call(leadQuotationMethods.markSent, args)
export const setQuoteStatus = (args) =>
  call(leadQuotationMethods.setStatus, args)
export const createRevision = (quotation) =>
  call(leadQuotationMethods.revise, { quotation })
export const saveQuotationPdf = (quotation) =>
  call(leadQuotationMethods.savePdf, { quotation })
export const makeSalesOrder = (quotation) =>
  call(leadQuotationMethods.salesOrder, { quotation })
export const savePackage = (values) =>
  call(leadQuotationMethods.savePackage, { values: JSON.stringify(values) })
export const setServiceRate = (item_code, rate) =>
  call(leadQuotationMethods.setRate, { item_code, rate })

// The Pipeline dashboard (tbo_smart.api.lead_pipeline_dashboard)
const DASHBOARD_API = 'tbo_smart.api.lead_pipeline_dashboard'
export const dashboardMethods = {
  access: `${DASHBOARD_API}.get_access`,
  dashboard: `${DASHBOARD_API}.get_pipeline_dashboard`,
}

let dashboardAccessResource

export function usePipelineDashboardAccess() {
  if (!dashboardAccessResource) {
    dashboardAccessResource = createResource({
      url: dashboardMethods.access,
      cache: 'tbo-pipeline-dashboard-access',
    })
    load(dashboardAccessResource)
  }
  return {
    resource: dashboardAccessResource,
    enabled: computed(() =>
      Boolean(
        !dashboardAccessResource.error && dashboardAccessResource.data?.enabled,
      ),
    ),
  }
}

export const refreshDashboardAccess = () =>
  dashboardAccessResource && load(dashboardAccessResource)

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
