import LucideArrowLeftRight from '~icons/lucide/arrow-left-right'
import LucideChartColumn from '~icons/lucide/chart-column'
import LucideShieldAlert from '~icons/lucide/shield-alert'
import LucideWallet from '~icons/lucide/wallet'
import { useFinanceAccess } from './api'

// The sidebar's BDE conversion entry, while the finance workflow is on. Call it
// inside a computed so it follows the access.
export function tboFinanceNavigationItems() {
  const { enabled, access } = useFinanceAccess()
  if (!enabled.value) return []
  const items = [
    {
      label: 'BDE conversion',
      icon: LucideChartColumn,
      route: 'BDE Conversion',
    },
  ]
  // Phase 2: amounts on the Receivables page follow the server's amount rule
  if (access.value?.receivables && access.value?.can_see_amounts) {
    items.push({
      label: 'Receivables',
      icon: LucideWallet,
      route: 'Receivables',
    })
  }
  if (access.value?.receivables) {
    items.push({
      label: 'Finance exceptions',
      icon: LucideShieldAlert,
      route: 'Finance Exceptions',
    })
  }
  // Phase 3: India's share, accounts / finance / management only
  if (access.value?.allocations) {
    items.push({
      label: 'Allocations',
      icon: LucideArrowLeftRight,
      route: 'Allocations',
    })
  }
  return items
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
