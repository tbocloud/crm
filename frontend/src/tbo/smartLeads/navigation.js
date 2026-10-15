import LucidePhoneCall from '~icons/lucide/phone-call'
import { useSmartLeadsAccess } from './api'

// The sidebar's Call today entry, while lead scoring is on (or, for the sales
// head, while follow-ups or the triage are). Call it inside a computed.
export function tboSmartLeadsNavigationItems() {
  const { access } = useSmartLeadsAccess()
  const a = access.value
  if (!a?.scoring && !(a?.is_sales_head && (a?.follow_ups || a?.triage)))
    return []
  return [{ label: 'Call today', icon: LucidePhoneCall, route: 'Call Today' }]
}
