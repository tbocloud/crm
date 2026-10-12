<template>
  <section class="flex flex-col" :aria-labelledby="headingId">
    <div
      class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-2 pb-2"
    >
      <h2 :id="headingId" class="text-base font-semibold text-ink-gray-9">
        {{ title }}
        <span
          class="ml-1 font-mono text-sm font-normal tabular-nums text-ink-gray-5"
        >
          {{ count }}
        </span>
      </h2>
      <slot name="actions" />
    </div>
    <ul v-if="count" class="flex flex-col divide-y divide-outline-gray-1">
      <slot />
    </ul>
    <p v-else class="py-4 text-p-sm text-ink-gray-6">{{ empty }}</p>
  </section>
</template>

<script setup>
import { useId } from 'vue'

defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 0 },
  empty: { type: String, required: true },
})
const headingId = useId()
</script>
