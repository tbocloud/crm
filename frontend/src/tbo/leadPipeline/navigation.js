import { useLeadPipelineAccess } from './api'

// The lead's Meetings tab, while the lead pipeline is on. Call it inside the
// lead page's tabs computed so it follows the access.
export function leadMeetingsTab({ icon }) {
  const { enabled } = useLeadPipelineAccess()
  return {
    name: 'Meetings',
    label: __('Meetings'),
    icon,
    condition: () => enabled.value,
  }
}

// While the pipeline is on, a deal comes only from Closed – Won, so the lead
// page's Convert to Deal is off (tbo_smart refuses it too).
export function useConversionLock() {
  const { enabled } = useLeadPipelineAccess()
  return enabled
}
