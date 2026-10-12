<template>
  <div>
    <label
      :for="id"
      :class="showLabel ? 'mb-1.5 block text-base text-ink-gray-6' : 'sr-only'"
    >
      {{ label }}
    </label>
    <div
      v-if="!showLabel"
      class="mb-1 text-xs text-ink-gray-6 sm:hidden"
      aria-hidden="true"
    >
      {{ label }}
    </div>
    <input
      :id="id"
      v-model="model"
      type="number"
      inputmode="decimal"
      v-bind="$attrs"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="form-input h-7 w-full rounded border-0 bg-surface-gray-2 px-2 text-right font-mono text-base tabular-nums text-ink-gray-8 focus:bg-surface-base focus-visible:ring-2 focus-visible:ring-outline-gray-3"
      :class="{ 'ring-1 ring-danger': error }"
    />
    <p
      v-if="error"
      :id="`${id}-error`"
      role="alert"
      class="mt-1 text-xs text-danger"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { useId } from 'vue'

defineOptions({ inheritAttrs: false })
defineProps({
  label: { type: String, required: true },
  error: { type: String, default: '' },
  // show the label above the field; otherwise it is for screen readers (and phones)
  showLabel: { type: Boolean, default: false },
})
const model = defineModel({ type: [Number, String] })
const id = useId()
</script>
