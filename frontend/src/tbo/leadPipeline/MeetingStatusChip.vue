<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
    :class="TONE_CLASSES[tone.tone]"
  >
    <component :is="ICONS[tone.icon]" class="size-3" aria-hidden="true" />
    {{ __(status) }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideCircleCheck from '~icons/lucide/circle-check'
import LucideCircleDot from '~icons/lucide/circle-dot'
import LucideCircleX from '~icons/lucide/circle-x'
import LucideClock from '~icons/lucide/clock'
import { meetingTone } from './pipeline'

const props = defineProps({ status: { type: String, required: true } })
const tone = computed(() => meetingTone(props.status))
const TONE_CLASSES = {
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-gray-2 text-ink-gray-7',
}
const ICONS = {
  check: LucideCircleCheck,
  alert: LucideCircleAlert,
  clock: LucideClock,
  x: LucideCircleX,
  dot: LucideCircleDot,
}
</script>
