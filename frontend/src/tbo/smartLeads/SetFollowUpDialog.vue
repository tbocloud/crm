<template>
  <Dialog v-model:open="open" :title="__('Set next follow-up')" size="sm">
    <template #default>
      <form
        :id="formId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="save"
      >
        <p class="-mt-3 text-p-sm text-ink-gray-6">{{ leadName }}</p>
        <div>
          <FormControl v-model="due" type="date" :label="__('Date')" required />
          <p v-if="dateError" role="alert" class="mt-1 text-p-sm text-danger">
            {{ __(dateError) }}
          </p>
        </div>
        <FormControl
          v-model="title"
          :label="__('What to do')"
          :placeholder="__('Optional, e.g. Send the quote')"
        />
        <p
          v-if="error"
          role="alert"
          class="whitespace-pre-line text-p-sm text-danger"
        >
          {{ error }}
        </p>
      </form>
    </template>
    <template #actions>
      <div class="flex justify-end gap-2">
        <Button :label="__('Cancel')" @click="open = false" />
        <Button
          variant="solid"
          type="submit"
          :form="formId"
          :label="__('Save')"
          :loading="saving"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { Button, Dialog, FormControl, toast } from 'frappe-ui'
import { ref, watch } from 'vue'
import { errorMessage, setFollowUp } from './api'
import { followUpError, localToday } from './smartLeads'

const props = defineProps({
  lead: { type: String, required: true },
  leadName: { type: String, default: '' },
})
const emit = defineEmits(['saved'])
const open = defineModel({ type: Boolean })
const formId = `tbo-next-follow-up-${Math.random().toString(36).slice(2, 8)}`
const due = ref('')
const title = ref('')
const dateError = ref('')
const error = ref('')
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  due.value = localToday(tomorrow)
  title.value = ''
  dateError.value = ''
  error.value = ''
})

async function save() {
  dateError.value = followUpError(due.value, localToday())
  if (dateError.value) return
  saving.value = true
  error.value = ''
  try {
    await setFollowUp(props.lead, `${due.value} 10:00:00`, title.value.trim())
    toast.success(__('Follow-up set'))
    emit('saved')
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
