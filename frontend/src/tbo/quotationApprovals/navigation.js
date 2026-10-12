import LucideBadgeCheck from '~icons/lucide/badge-check'
import { useApprovalAccess } from './api'

// The sidebar's Approvals entry, only for approvers and for people waiting on
// a request of their own. Call it inside a computed so it follows the access.
export function tboNavigationItems() {
  const { showApprovals } = useApprovalAccess()
  if (!showApprovals.value) return []
  return [
    {
      label: 'Approvals',
      icon: LucideBadgeCheck,
      route: 'Quotation Approvals',
    },
  ]
}
