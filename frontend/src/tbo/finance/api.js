// The CRM side of tbo_smart's finance workflow (docs/tbo-finance.md). Every
// call goes to tbo_smart, which checks permissions. When tbo_smart is missing
// or the workflow is off, the access call fails or says disabled, and the deal
// keeps the stock Quotations tab.
import { call, createResource } from 'frappe-ui'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { globalStore } from '@/stores/global'
import { load } from '@/tbo/quotationApprovals/api'

export { errorMessage, load } from '@/tbo/quotationApprovals/api'

const API = 'tbo_smart.api.finance'

export const methods = {
  access: `${API}.deal.get_finance_access`,
  deal: `${API}.deal.get_deal_finance`,
  onboarding: `${API}.deal.set_onboarding_complete`,
  close: `${API}.deal.set_finance_closed`,
  quotationForm: `${API}.quotation.get_quotation_form`,
  itemPrice: `${API}.quotation.get_item_price`,
  saveQuotation: `${API}.quotation.save_quotation`,
  submitQuotation: `${API}.quotation.submit_quotation`,
  conversion: `${API}.report.get_bde_conversion`,
}

let accessResource

// Whether the finance workflow is on, and what the session user may do. One
// shared resource for the deal tab, the sidebar and the report.
export function useFinanceAccess() {
  if (!accessResource) {
    accessResource = createResource({
      url: methods.access,
      cache: 'tbo-finance-access',
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

export const setOnboarding = (deal, complete) =>
  call(methods.onboarding, { deal, complete: complete ? 1 : 0 })

export const setClosed = (deal, closed) =>
  call(methods.close, { deal, closed: closed ? 1 : 0 })

export const saveQuotation = (deal, values, quotation) =>
  call(methods.saveQuotation, {
    deal,
    quotation: quotation || null,
    values: JSON.stringify(values),
  })

export const submitQuotation = (deal, quotation) =>
  call(methods.submitQuotation, { deal, quotation })

export const getItemPrice = (item_code, company) =>
  call(methods.itemPrice, { item_code, company })

// Reload a deal's finance data when tbo_smart says it changed, when one of its
// quotations changes (the CRM's own event) and when the window regains focus.
export function useDealFinanceRefresh(deal, reload) {
  const { $socket } = globalStore()
  const debounced = useDebounceFn(reload, 300)
  function onUpdate(data) {
    if (data?.crm_deal === deal()) debounced()
  }
  onMounted(() => {
    $socket?.on('tbo_deal_finance_update', onUpdate)
    $socket?.on('crm_quotation_update', onUpdate)
  })
  onBeforeUnmount(() => {
    $socket?.off('tbo_deal_finance_update', onUpdate)
    $socket?.off('crm_quotation_update', onUpdate)
  })
  useEventListener(window, 'focus', () => debounced())
  return debounced
}
