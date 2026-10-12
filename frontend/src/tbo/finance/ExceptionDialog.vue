<template>
  <Dialog v-model:open="open" :title="__('Request an exception')" size="lg">
    <template #default>
      <p class="-mt-3 mb-4 text-p-base text-ink-gray-7">
        {{ __('Invoice') }}
        <span class="font-mono text-ink-gray-9">{{ invoice }}</span>
        ·
        {{
          __(
            'A TBO Finance Approver decides it; you cannot approve your own request.',
          )
        }}
      </p>
      <form
        :id="formId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="save"
      >
        <fieldset>
          <legend class="mb-2 text-base text-ink-gray-7">
            {{ __('What do you need?') }}
          </legend>
          <div class="flex flex-col gap-2">
            <label
              v-for="request in EXCEPTION_REQUESTS"
              :key="request.type"
              class="flex cursor-pointer items-center gap-2 rounded border border-outline-gray-2 px-3 py-2 text-base text-ink-gray-8 has-[:checked]:border-outline-gray-5"
            >
              <input
                v-model="form.exception_type"
                type="radio"
                name="exception_type"
                :value="request.type"
                class="text-ink-gray-9 focus-visible:ring-2 focus-visible:ring-outline-gray-3"
              />
              {{ __(request.label) }}
            </label>
          </div>
          <p
            v-if="errors.exception_type"
            role="alert"
            class="mt-1 text-p-sm text-danger"
          >
            {{ errors.exception_type }}
          </p>
        </fieldset>
        <FormControl
          v-if="terms.length > 1"
          v-model="form.payment_schedule"
          type="select"
          :label="__('Payment term')"
          :options="termOptions"
        />
        <div v-if="needs === 'new_due_date'">
          <FormControl
            v-model="form.new_due_date"
            type="date"
            :label="__('New due date')"
            required
          />
          <p
            v-if="errors.new_due_date"
            role="alert"
            class="mt-1 text-p-sm text-danger"
          >
            {{ errors.new_due_date }}
          </p>
        </div>
        <div v-if="needs === 'pause_until'">
          <FormControl
            v-model="form.pause_until"
            type="date"
            :label="__('Pause reminders until')"
            required
          />
          <p
            v-if="errors.pause_until"
            role="alert"
            class="mt-1 text-p-sm text-danger"
          >
            {{ errors.pause_until }}
          </p>
        </div>
        <div
          v-if="needs === 'resolution'"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <FormControl
            v-model="form.resolution_reference_doctype"
            type="select"
            :label="__('Write-off document')"
            :options="[
              {
                label: __('Credit note (Sales Invoice)'),
                value: 'Sales Invoice',
              },
              { label: __('Journal Entry'), value: 'Journal Entry' },
            ]"
          />
          <Link
            v-model="form.resolution_reference_name"
            :doctype="form.resolution_reference_doctype"
            :label="__('Document')"
            :placeholder="__('Accounts can link it later')"
          />
        </div>
        <div>
          <FormControl
            v-model="form.reason"
            type="textarea"
            :rows="3"
            :label="__('Reason')"
            required
          />
          <p
            v-if="errors.reason"
            role="alert"
            class="mt-1 text-p-sm text-danger"
          >
            {{ errors.reason }}
          </p>
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
            :label="__('Send for approval')"
            :loading="saving"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import Link from '@/components/Controls/Link.vue'
import { formatDate } from '@/utils'
import { Dialog, FormControl, toast } from 'frappe-ui'
import { computed, reactive, ref, watch } from 'vue'
import { errorMessage, requestException } from './api'
import {
  EXCEPTION_REQUESTS,
  localToday,
  validateExceptionRequest,
} from './finance'

const props = defineProps({
  invoice: { type: String, required: true },
  // the invoice's payment terms: [{ name, payment_term, due_date }]
  terms: { type: Array, default: () => [] },
})
const emit = defineEmits(['saved'])
const open = defineModel({ type: Boolean })
const formId = `tbo-exception-${Math.random().toString(36).slice(2, 8)}`
const blank = () => ({
  exception_type: 'Extension request',
  payment_schedule: '',
  new_due_date: '',
  pause_until: '',
  resolution_reference_doctype: 'Sales Invoice',
  resolution_reference_name: '',
  reason: '',
})
const form = reactive(blank())
const errors = ref({})
const error = ref('')
const saving = ref(false)

const needs = computed(
  () =>
    EXCEPTION_REQUESTS.find((row) => row.type === form.exception_type)?.needs,
)
const termOptions = computed(() => [
  { label: __('Whole invoice'), value: '' },
  ...props.terms.map((term, i) => ({
    label: `${term.payment_term || __('Term {0}', [i + 1])} · ${__('due {0}', [formatDate(term.due_date, '', true)])}`,
    value: term.name,
  })),
])

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    Object.assign(form, blank())
    errors.value = {}
    error.value = ''
  },
  { immediate: true },
)

async function save() {
  errors.value = validateExceptionRequest(form, localToday())
  if (Object.keys(errors.value).length) return
  saving.value = true
  error.value = ''
  try {
    await requestException({
      invoice: props.invoice,
      exception_type: form.exception_type,
      reason: form.reason,
      payment_schedule: form.payment_schedule || null,
      new_due_date: needs.value === 'new_due_date' ? form.new_due_date : null,
      pause_until: needs.value === 'pause_until' ? form.pause_until : null,
      resolution_reference_doctype:
        needs.value === 'resolution' && form.resolution_reference_name
          ? form.resolution_reference_doctype
          : null,
      resolution_reference_name:
        needs.value === 'resolution'
          ? form.resolution_reference_name || null
          : null,
    })
    toast.success(__('Sent for approval'))
    emit('saved')
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
