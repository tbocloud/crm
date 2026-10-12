import { createResource } from 'frappe-ui'
import { computed, watch } from 'vue'
import { load, methods, useAdjustmentRefresh, useApprovalAccess } from './api'

// Adjustment status for every quotation on a deal, in one call. `names` is a
// getter for the quotation names currently listed.
export function useQuotationAdjustments(names) {
  const { access, enabled } = useApprovalAccess()
  const statuses = createResource({ url: methods.statuses })

  function reload() {
    const list = names()
    if (!enabled.value || !list.length) return
    load(statuses, { quotations: JSON.stringify(list) })
  }

  watch(
    () => [enabled.value, names().join(',')],
    () => reload(),
    { immediate: true },
  )
  useAdjustmentRefresh(reload)

  return {
    access,
    enabled,
    reload,
    statusFor: (name) => (enabled.value ? statuses.data?.[name] : null),
    error: computed(() => statuses.error),
  }
}
