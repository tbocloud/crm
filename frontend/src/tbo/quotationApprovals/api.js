// The CRM side of tbo_smart's quotation discount and commission approvals.
// Every call goes to tbo_smart, which checks permissions; when tbo_smart is not
// installed (or enforcement is off) the access call fails or says disabled, and
// every screen here hides itself.
import { call, createResource } from 'frappe-ui'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { globalStore } from '@/stores/global'
import { canSeeApprovals } from './status'

const API = 'tbo_smart.api.quotation_adjustment'
export const ADJUSTMENT_DOCTYPE = 'TBO Quotation Adjustment'

export const methods = {
  limits: `${API}.get_adjustment_limits`,
  statuses: `${API}.get_quotations_adjustment_status`,
  pending: `${API}.get_pending_approvals`,
  requests: `${API}.get_adjustment_requests`,
  trail: `${API}.get_adjustment_trail`,
  request: `${API}.request_adjustment`,
  decide: `${API}.decide_adjustment`,
}

let accessResource

// The session user's level, limits and what they may do. One shared resource.
export function useApprovalAccess() {
  if (!accessResource) {
    accessResource = createResource({
      url: methods.limits,
      cache: 'tbo-quotation-approval-access',
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
    showApprovals: computed(() => canSeeApprovals(access.value)),
  }
}

// Fetch without an unhandled rejection: a failure is kept on resource.error,
// which the screens show (or, for the access call, read as "not installed").
export function load(resource, params) {
  const promise = params ? resource.submit(params) : resource.reload()
  return promise?.catch?.(() => {})
}

export function requestAdjustment(args) {
  return call(methods.request, args)
}

export function decideAdjustment(args) {
  return call(methods.decide, args)
}

export function errorMessage(error) {
  const message = error?.messages?.[0] || error?.message || ''
  // frappe.throw messages can carry <br>; show them as plain lines
  return message.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
}

// Reload when any adjustment changes (Frappe broadcasts list_update to every
// desk user) and when the window regains focus.
export function useAdjustmentRefresh(reload) {
  const { $socket } = globalStore()
  const debounced = useDebounceFn(reload, 300)
  function onListUpdate(data) {
    if (data?.doctype === ADJUSTMENT_DOCTYPE) debounced()
  }
  onMounted(() => $socket?.on('list_update', onListUpdate))
  onBeforeUnmount(() => $socket?.off('list_update', onListUpdate))
  useEventListener(window, 'focus', () => debounced())
  return debounced
}
