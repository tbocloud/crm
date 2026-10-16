<template>
  <Dialog
    v-model:open="open"
    :title="__('{0}: {1}', [quotation, __(status)])"
    size="md"
  >
    <template #default>
      <form
        :id="formId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="save"
      >
        <p v-if="status === 'Accepted'" class="text-p-base text-ink-gray-7">
          {{
            __(
              'The lead becomes Closed – Won and its deal is created; the quotation moves to the deal.',
            )
          }}
        </p>
        <FormControl
          v-model="note"
          type="textarea"
          :rows="3"
          :label="
            status === 'Rejected'
              ? __('Why did the client reject it?')
              : __('Note')
          "
          :required="status === 'Rejected'"
        />
        <template v-if="status === 'Rejected'">
          <Checkbox
            v-model="closeLead"
            :label="__('Close the lead as Closed – Lost too')"
          />
          <FormControl
            v-if="closeLead"
            v-model="lostReason"
            :label="__('Why was the lead lost?')"
            required
          />
        </template>
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
import { Button, Checkbox, Dialog, FormControl, toast } from 'frappe-ui'
import { ref, watch } from 'vue'
import { errorMessage, setQuoteStatus } from './api'

const props = defineProps({
  quotation: { type: String, required: true },
  status: { type: String, required: true },
})
const emit = defineEmits(['saved'])
const open = defineModel({ type: Boolean })
const formId = `tbo-quote-status-${Math.random().toString(36).slice(2, 8)}`
const note = ref('')
const closeLead = ref(false)
const lostReason = ref('')
const saving = ref(false)
const error = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  note.value = ''
  closeLead.value = false
  lostReason.value = ''
  error.value = ''
})

async function save() {
  if (props.status === 'Rejected' && !note.value.trim()) {
    error.value = __('Say why the client rejected it.')
    return
  }
  if (closeLead.value && !lostReason.value.trim()) {
    error.value = __('Give a reason for losing the lead.')
    return
  }
  saving.value = true
  error.value = ''
  try {
    await setQuoteStatus({
      quotation: props.quotation,
      status: props.status,
      note: note.value.trim() || null,
      close_lead: closeLead.value ? 1 : 0,
      lost_reason: lostReason.value.trim() || null,
    })
    toast.success(__('{0}: {1}', [props.quotation, __(props.status)]))
    emit('saved')
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
