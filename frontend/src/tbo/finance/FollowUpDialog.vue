<template>
  <Dialog v-model:open="open" :title="__('Add follow-up')" size="md">
    <template #default>
      <p class="-mt-3 mb-4 text-p-base text-ink-gray-7">
        {{ __('Invoice') }}
        <span class="font-mono text-ink-gray-9">{{ invoice }}</span>
      </p>
      <form
        :id="formId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="save"
      >
        <div>
          <FormControl
            v-model="form.due_date"
            type="date"
            :label="__('Next follow-up')"
            required
          />
          <p
            v-if="errors.due_date"
            role="alert"
            class="mt-1 text-p-sm text-danger"
          >
            {{ errors.due_date }}
          </p>
        </div>
        <FormControl
          v-model="form.remark"
          type="textarea"
          :rows="3"
          :label="__('Remark')"
          :placeholder="__('What the client said, and the next action')"
        />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FormControl
              v-model="form.promised_date"
              type="date"
              :label="__('Promised payment date')"
            />
            <p
              v-if="errors.promised_date"
              role="alert"
              class="mt-1 text-p-sm text-danger"
            >
              {{ errors.promised_date }}
            </p>
          </div>
          <NumberField
            v-model="form.promised_amount"
            :label="__('Promised amount')"
            :error="errors.promised_amount"
            show-label
            min="0"
            step="0.01"
          />
        </div>
      </form>
    </template>
    <template #actions>
      <div class="flex flex-col gap-3">
        <p
          v-if="error"
          role="alert"
          class="whitespace-pre-line text-p-sm text-danger"
        >
          {{ error }}
        </p>
        <div class="flex justify-end gap-2">
          <Button :label="__('Cancel')" @click="open = false" />
          <Button
            variant="solid"
            type="submit"
            :form="formId"
            :label="__('Save follow-up')"
            :loading="saving"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { Dialog, FormControl, toast } from 'frappe-ui'
import { reactive, ref, watch } from 'vue'
import NumberField from './NumberField.vue'
import { addFollowUp, errorMessage } from './api'
import { localToday, validateFollowUp } from './finance'

const props = defineProps({
  invoice: { type: String, required: true },
})
const emit = defineEmits(['saved'])
const open = defineModel({ type: Boolean })
const formId = `tbo-follow-up-${Math.random().toString(36).slice(2, 8)}`
const form = reactive({
  due_date: '',
  remark: '',
  promised_date: '',
  promised_amount: '',
})
const errors = ref({})
const error = ref('')
const saving = ref(false)

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    Object.assign(form, {
      due_date: localToday(),
      remark: '',
      promised_date: '',
      promised_amount: '',
    })
    errors.value = {}
    error.value = ''
  },
  { immediate: true },
)

async function save() {
  errors.value = validateFollowUp(form, localToday())
  if (Object.keys(errors.value).length) return
  saving.value = true
  error.value = ''
  try {
    await addFollowUp({
      invoice: props.invoice,
      due_date: form.due_date,
      remark: form.remark || null,
      promised_date: form.promised_date || null,
      promised_amount:
        form.promised_amount === '' ? null : Number(form.promised_amount),
    })
    toast.success(__('Follow-up saved'))
    emit('saved')
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
