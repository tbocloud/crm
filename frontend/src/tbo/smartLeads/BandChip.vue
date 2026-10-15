<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
    :class="style.classes"
    :title="reason || undefined"
  >
    <component :is="icon" class="size-3" aria-hidden="true" />
    {{ __(band || 'Cold') }}
    <span
      v-if="score !== null && score !== undefined"
      class="font-mono tabular-nums"
    >
      {{ score }}
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import LucideFlame from '~icons/lucide/flame'
import LucideSnowflake from '~icons/lucide/snowflake'
import LucideThermometer from '~icons/lucide/thermometer'
import { bandStyle } from './smartLeads'

const props = defineProps({
  band: { type: String, default: 'Cold' },
  score: { type: Number, default: null },
  reason: { type: String, default: '' },
})
const style = computed(() => bandStyle(props.band))
const icon = computed(
  () =>
    ({ Hot: LucideFlame, Warm: LucideThermometer })[props.band] ||
    LucideSnowflake,
)
</script>
