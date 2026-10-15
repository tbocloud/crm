<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-xs text-ink-gray-5">{{ label }}</label>
    <div v-if="!editing" class="flex flex-wrap items-center gap-2">
      <span class="font-mono text-p-sm text-ink-gray-7">
        {{
          removed
            ? __('Will be removed on save')
            : state?.set
              ? state.masked
              : __('Not set')
        }}
      </span>
      <Button
        :id="id"
        size="sm"
        :label="state?.set ? __('Replace') : __('Add')"
        @click="editing = true"
      />
      <Button
        v-if="state?.set && !removed"
        size="sm"
        variant="ghost"
        :label="__('Remove')"
        @click="model = ''"
      />
      <Button
        v-if="removed"
        size="sm"
        variant="ghost"
        :label="__('Keep')"
        @click="model = null"
      />
    </div>
    <div v-else class="flex items-center gap-2">
      <input
        :id="id"
        v-model="draft"
        type="password"
        autocomplete="off"
        class="h-7 flex-1 rounded border-outline-gray-2 bg-surface-gray-2 px-2 text-p-sm text-ink-gray-8 focus:border-outline-gray-4 focus:bg-surface-base"
        :placeholder="__('Paste it here')"
        @keydown.enter.prevent="apply"
      />
      <Button
        size="sm"
        :label="__('Use')"
        :disabled="!draft.trim()"
        @click="apply"
      />
      <Button size="sm" variant="ghost" :label="__('Cancel')" @click="cancel" />
    </div>
    <p v-if="model && !editing" class="text-p-sm text-ink-gray-6">
      {{ __('New value; saved when you click Save.') }}
    </p>
    <p v-if="description" class="text-p-sm text-ink-gray-5">
      {{ description }}
    </p>
  </div>
</template>

<script setup>
import { Button } from 'frappe-ui'
import { computed, ref } from 'vue'

defineProps({
  label: { type: String, required: true },
  description: { type: String, default: '' },
  // {set, masked} from the server; the value itself never comes back
  state: { type: Object, default: null },
})
const model = defineModel({ type: String, default: null })
const id = `tbo-secret-${Math.random().toString(36).slice(2, 8)}`
const editing = ref(false)
const draft = ref('')
const removed = computed(() => model.value === '')

function apply() {
  model.value = draft.value.trim()
  draft.value = ''
  editing.value = false
}

function cancel() {
  draft.value = ''
  editing.value = false
}
</script>
