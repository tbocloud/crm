<template>
  <ol
    class="flex flex-wrap items-center gap-x-1 gap-y-2"
    :aria-label="__('Post-sale stage')"
  >
    <li
      v-for="(step, i) in steps"
      :key="step.stage"
      class="flex items-center gap-1"
      :aria-current="step.state === 'current' ? 'step' : undefined"
    >
      <span
        class="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm"
        :class="{
          'bg-brand text-brand-on font-medium': step.state === 'current',
          'bg-surface-gray-2 text-ink-gray-7': step.state === 'done',
          'text-ink-gray-5': step.state === 'todo',
        }"
      >
        <LucideCheck
          v-if="step.state === 'done'"
          class="size-3.5"
          aria-hidden="true"
        />
        <LucideCircleDot
          v-else-if="step.state === 'current'"
          class="size-3.5"
          aria-hidden="true"
        />
        <LucideCircle v-else class="size-3.5" aria-hidden="true" />
        {{ __(step.stage) }}
        <span class="sr-only">
          {{
            step.state === 'done'
              ? __('(done)')
              : step.state === 'current'
                ? __('(current)')
                : __('(to come)')
          }}
        </span>
      </span>
      <LucideChevronRight
        v-if="i < steps.length - 1"
        class="size-3.5 text-ink-gray-4"
        aria-hidden="true"
      />
    </li>
  </ol>
</template>

<script setup>
import { computed } from 'vue'
import LucideCheck from '~icons/lucide/check'
import LucideCircle from '~icons/lucide/circle'
import LucideCircleDot from '~icons/lucide/circle-dot'
import LucideChevronRight from '~icons/lucide/chevron-right'
import { stageSteps } from './finance'

const props = defineProps({
  stages: { type: Array, required: true },
  current: { type: String, default: '' },
})

const steps = computed(() => stageSteps(props.stages, props.current))
</script>
