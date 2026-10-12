import LucideChartColumn from '~icons/lucide/chart-column'
import { useFinanceAccess } from './api'

// The sidebar's BDE conversion entry, while the finance workflow is on. Call it
// inside a computed so it follows the access.
export function tboFinanceNavigationItems() {
  const { enabled } = useFinanceAccess()
  if (!enabled.value) return []
  return [
    {
      label: 'BDE conversion',
      icon: LucideChartColumn,
      route: 'BDE Conversion',
    },
  ]
}

// The deal's last tab: Finance while the workflow is on, else the stock
// Quotations tab (shown to whoever can read ERPNext quotations).
export function dealFinanceTab({ icon, canViewQuotations }) {
  const { enabled } = useFinanceAccess()
  if (enabled.value) {
    return { name: 'Finance', label: __('Finance'), icon }
  }
  return {
    name: 'Quotations',
    label: __('Quotations'),
    icon,
    condition: () => canViewQuotations.value,
  }
}
