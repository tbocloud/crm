<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
    :class="TONE_CLASSES[tone] || TONE_CLASSES.neutral"
  >
    <component
      :is="ICONS[icon] || ICONS.dot"
      class="size-3"
      aria-hidden="true"
    />
    {{ __(label) }}
  </span>
</template>

<script setup>
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideCircleCheck from '~icons/lucide/circle-check'
import LucideCircleDot from '~icons/lucide/circle-dot'
import LucideCircleX from '~icons/lucide/circle-x'
import LucideClock from '~icons/lucide/clock'
// A status with its meaning colour, always with an icon and the text
// (meetingTone and quoteTone in pipeline.js / quotes.js give tone and icon).
defineProps({
  label: { type: String, required: true },
  tone: { type: String, default: 'neutral' },
  icon: { type: String, default: 'dot' },
})
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
