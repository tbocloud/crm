<template>
  <div class="flex items-start justify-between gap-4">
    <div class="flex flex-col">
      <label :for="id" class="text-p-base-medium text-ink-gray-8">{{
        label
      }}</label>
      <p v-if="description" class="text-p-sm text-ink-gray-5">
        {{ description }}
      </p>
    </div>
    <Switch :id="id" v-model="model" size="sm" />
  </div>
</template>

<script setup>
import { Switch } from 'frappe-ui'

defineProps({
  label: { type: String, required: true },
  description: { type: String, default: '' },
})
const model = defineModel({ type: Boolean })
const id = `tbo-switch-${Math.random().toString(36).slice(2, 8)}`
</script>
