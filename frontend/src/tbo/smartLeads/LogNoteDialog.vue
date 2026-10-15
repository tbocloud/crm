<template>
  <Dialog v-model:open="open" :title="__('Log call')" size="lg">
    <template #default>
      <p class="-mt-3 mb-4 text-p-sm text-ink-gray-6">
        {{ leadName }}
        <span v-if="status">· {{ __(status) }}</span>
      </p>
      <NoteBox
        v-if="open"
        :lead="lead"
        :status="status"
        :ai="ai"
        initial-kind="call"
        @saved="onSaved"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { Dialog } from 'frappe-ui'
import NoteBox from './NoteBox.vue'

defineProps({
  lead: { type: String, required: true },
  leadName: { type: String, default: '' },
  status: { type: String, default: '' },
  ai: { type: Boolean, default: false },
})
const emit = defineEmits(['saved'])
const open = defineModel({ type: Boolean })

function onSaved(result) {
  emit('saved', result)
  open.value = false
}
</script>
