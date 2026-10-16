<template>
  <Dialog
    v-model:open="open"
    :title="__('Mark {0} sent', [quotation])"
    size="lg"
  >
    <template #default>
      <form
        :id="formId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="save"
      >
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-ink-gray-5">{{
            __('How did it go to the client?')
          }}</span>
          <TabButtons
            v-model="via"
            :buttons="[
              { label: __('Email'), value: 'Email' },
              { label: __('WhatsApp'), value: 'WhatsApp' },
              { label: __('Already sent'), value: 'Manual' },
            ]"
          />
        </div>
        <FormControl
          v-if="via === 'Email'"
          v-model="recipients"
          type="email"
          :label="__('To')"
          :placeholder="__('The lead\'s email when left blank')"
        />
        <FormControl
          v-if="via !== 'Manual'"
          v-model="message"
          type="textarea"
          :rows="3"
          :label="__('Message')"
          :placeholder="__('Please find our quotation attached.')"
        />
        <p v-if="via === 'Email'" class="text-p-sm text-ink-gray-6">
          {{
            __(
              'ERPNext sends it with the TBO PDF attached and keeps the email on the quotation.',
            )
          }}
        </p>
        <p v-else-if="via === 'WhatsApp'" class="text-p-sm text-ink-gray-6">
          {{
            __(
              'WhatsApp opens with the message. Attach the PDF there (Download PDF from the quotation menu).',
            )
          }}
        </p>
        <FormControl
          v-model="followUpDays"
          type="number"
          min="0"
          max="90"
          :label="__('Follow up after (days)')"
          :description="__('0: no follow-up task')"
        />
        <p class="text-p-sm text-ink-gray-6">
          {{
            __(
              "A draft is submitted first. It can't be sent while its approval is pending.",
            )
          }}
        </p>
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
          :label="via === 'Email' ? __('Send') : __('Mark sent')"
          :loading="saving"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { Button, Dialog, FormControl, TabButtons, toast } from 'frappe-ui'
import { ref, watch } from 'vue'
import { errorMessage, markQuotationSent } from './api'

const props = defineProps({ quotation: { type: String, required: true } })
const emit = defineEmits(['saved'])
const open = defineModel({ type: Boolean })
const formId = `tbo-mark-sent-${Math.random().toString(36).slice(2, 8)}`
const via = ref('Email')
const recipients = ref('')
const message = ref('')
const followUpDays = ref(3)
const saving = ref(false)
const error = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  via.value = 'Email'
  recipients.value = ''
  message.value = ''
  followUpDays.value = 3
  error.value = ''
})

async function save() {
  saving.value = true
  error.value = ''
  // opened during the click, so popup blockers allow it; pointed at WhatsApp below
  const popup = via.value === 'WhatsApp' ? window.open('', '_blank') : null
  if (popup) popup.opener = null
  try {
    const result = await markQuotationSent({
      quotation: props.quotation,
      via: via.value,
      recipients: recipients.value.trim() || null,
      message: message.value.trim() || null,
      follow_up_days: Math.max(0, Math.round(Number(followUpDays.value) || 0)),
    })
    if (popup && result.whatsapp_url) popup.location.href = result.whatsapp_url
    else popup?.close()
    toast.success(__('{0} is with the client', [props.quotation]))
    emit('saved', result)
    open.value = false
  } catch (e) {
    popup?.close()
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
