<template>
  <span
    class="inline-flex min-h-5 max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
    :class="[tone.classes, wrap ? 'text-left' : 'shrink-0 whitespace-nowrap']"
  >
    <component :is="tone.icon" class="size-3 shrink-0" aria-hidden="true" />
    <span v-if="prefix" class="text-ink-gray-7">{{ prefix }}</span>
    {{ label }}
  </span>
</template>

<script setup>
import LucideCheck from '~icons/lucide/check'
import LucideCircleCheck from '~icons/lucide/circle-check'
import LucideClock from '~icons/lucide/clock'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideCircleX from '~icons/lucide/circle-x'
import LucideBan from '~icons/lucide/ban'
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  // neutral | info | success | warning | danger, from status.js
  tone: { type: String, default: 'neutral' },
  // e.g. "Discount", shown before the label in muted ink
  prefix: { type: String, default: '' },
  voided: { type: Boolean, default: false },
  // let a long label (e.g. a level name) wrap inside a narrow column
  wrap: { type: Boolean, default: false },
})

const TONES = {
  neutral: { classes: 'bg-surface-gray-2 text-ink-gray-8', icon: LucideCheck },
  info: { classes: 'bg-info-soft text-info', icon: LucideClock },
  success: { classes: 'bg-success-soft text-success', icon: LucideCircleCheck },
  warning: { classes: 'bg-warning-soft text-warning', icon: LucideCircleAlert },
  danger: { classes: 'bg-danger-soft text-danger', icon: LucideCircleX },
}

const tone = computed(() =>
  props.voided
    ? { ...TONES.neutral, icon: LucideBan }
    : TONES[props.tone] || TONES.neutral,
)
</script>
