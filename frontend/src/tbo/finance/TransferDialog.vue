<template>
  <Dialog v-model:open="open" :title="__('New transfer')" size="3xl">
    <template #default>
      <div
        v-if="form.loading && !form.data"
        class="flex items-center justify-center gap-2 py-12 text-base text-ink-gray-6"
      >
        <LoadingIndicator class="size-4" />
        {{ __('Loading...') }}
      </div>
      <p v-else-if="form.error" role="alert" class="text-p-base text-danger">
        {{ errorMessage(form.error) }}
      </p>
      <form
        v-else-if="form.data"
        :id="formId"
        class="flex flex-col gap-5"
        novalidate
        @submit.prevent="save"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormControl
            v-model="values.ksa_payment_entry"
            type="select"
            :label="__('Sending Payment Entry')"
            :options="paymentOptions"
            required
          />
          <FormControl
            v-model="values.transfer_date"
            type="date"
            :label="__('Transfer date')"
            required
          />
          <FormControl
            v-model="values.reference_no"
            type="text"
            :label="__('Reference (SWIFT / UTR)')"
          />
          <NumberField
            v-model="values.withholding_tax"
            :label="__('Withholding tax')"
            show-label
            min="0"
            step="0.01"
          />
        </div>
        <p v-if="!form.data.payments.length" class="text-p-sm text-ink-gray-6">
          {{
            __(
              'Book the transfer as a payment (Pay) in ERPNext first; it then appears here.',
            )
          }}
        </p>

        <fieldset class="flex flex-col gap-2">
          <legend
            class="mb-2 flex w-full items-center justify-between text-base font-medium text-ink-gray-9"
          >
            {{ __('Allocations settled (oldest first)') }}
          </legend>
          <p v-if="!rows.length" class="text-p-sm text-ink-gray-6">
            {{ __('No open allocations.') }}
          </p>
          <div
            v-for="row in rows"
            :key="row.name"
            class="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 border-b border-outline-gray-1 pb-2"
          >
            <label
              :for="`amount-${row.name}`"
              class="min-w-0 text-p-sm text-ink-gray-7"
            >
              <span class="font-mono text-ink-gray-9">{{ row.name }}</span>
              · {{ row.customer }} ·
              {{ __('open {0}', [money(row.outstanding_amount)]) }}
            </label>
            <input
              :id="`amount-${row.name}`"
              v-model="amounts[row.name]"
              type="number"
              step="0.01"
              class="form-input h-7 w-full rounded border-0 bg-surface-gray-2 px-2 text-right font-mono text-base tabular-nums text-ink-gray-8 focus-visible:ring-2 focus-visible:ring-outline-gray-3"
            />
          </div>
        </fieldset>

        <dl class="grid grid-cols-3 gap-3 text-right">
          <div>
            <dt class="text-p-sm text-ink-gray-6">{{ __('Sent') }}</dt>
            <dd class="font-mono tabular-nums text-ink-gray-9">
              {{ money(sent) }}
            </dd>
          </div>
          <div>
            <dt class="text-p-sm text-ink-gray-6">{{ __('Settles') }}</dt>
            <dd class="font-mono tabular-nums text-ink-gray-9">
              {{ money(settled) }}
            </dd>
          </div>
          <div>
            <dt class="text-p-sm text-ink-gray-6">{{ __('Difference') }}</dt>
            <dd
              class="font-mono tabular-nums"
              :class="
                Math.abs(difference) > 1 ? 'text-warning' : 'text-ink-gray-9'
              "
            >
              {{ money(difference) }}
            </dd>
          </div>
        </dl>
        <p v-if="Math.abs(difference) > 1" class="text-p-sm text-ink-gray-6">
          {{
            __(
              'A difference above the tolerance raises an exception for the Finance Manager.',
            )
          }}
        </p>
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
            :label="__('Submit transfer')"
            :loading="saving"
            :disabled="!form.data"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { formatCurrency } from '@/utils/numberFormat.js'
import { Dialog, FormControl, createResource, toast } from 'frappe-ui'
import { computed, reactive, ref, watch } from 'vue'
import NumberField from './NumberField.vue'
import { allocationMethods, createTransfer, errorMessage, load } from './api'
import { localToday, suggestTransferRows } from './finance'

const emit = defineEmits(['saved'])
const open = defineModel({ type: Boolean })
const formId = `tbo-transfer-${Math.random().toString(36).slice(2, 8)}`
const values = reactive({
  ksa_payment_entry: '',
  transfer_date: localToday(),
  reference_no: '',
  withholding_tax: 0,
})
const amounts = reactive({})
const error = ref('')
const saving = ref(false)

const form = createResource({ url: allocationMethods.transferForm })
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    Object.assign(values, {
      ksa_payment_entry: '',
      transfer_date: localToday(),
      reference_no: '',
      withholding_tax: 0,
    })
    Object.keys(amounts).forEach((key) => delete amounts[key])
    error.value = ''
    load(form)
  },
  { immediate: true },
)

const rows = computed(() => form.data?.allocations || [])
const payments = computed(() => form.data?.payments || [])
const currency = computed(() => rows.value[0]?.currency)
const paymentOptions = computed(() => [
  { label: __('Choose a payment'), value: '' },
  ...payments.value.map((row) => ({
    label: `${row.name} · ${row.posting_date} · ${formatCurrency(row.base_paid_amount, '', currency.value)}`,
    value: row.name,
  })),
])
const sent = computed(
  () =>
    Number(
      payments.value.find((row) => row.name === values.ksa_payment_entry)
        ?.base_paid_amount,
    ) || 0,
)
const settled = computed(() =>
  Object.values(amounts).reduce((sum, value) => sum + (Number(value) || 0), 0),
)
const difference = computed(
  () =>
    Math.round(
      (sent.value + (Number(values.withholding_tax) || 0) - settled.value) *
        100,
    ) / 100,
)

// suggest FIFO amounts whenever the payment changes
watch(
  () => values.ksa_payment_entry,
  () => {
    Object.keys(amounts).forEach((key) => delete amounts[key])
    for (const row of suggestTransferRows(
      rows.value,
      sent.value + (Number(values.withholding_tax) || 0),
    )) {
      amounts[row.fund_allocation] = row.allocated_amount
    }
  },
)

function money(value) {
  return formatCurrency(value, '', currency.value)
}

async function save() {
  const chosen = Object.entries(amounts)
    .filter(([, value]) => Number(value))
    .map(([fund_allocation, value]) => ({
      fund_allocation,
      allocated_amount: Number(value),
    }))
  if (!values.ksa_payment_entry) {
    error.value = __('Choose the sending Payment Entry.')
    return
  }
  if (!chosen.length) {
    error.value = __('Enter the amount settled on at least one allocation.')
    return
  }
  saving.value = true
  error.value = ''
  try {
    const result = await createTransfer({
      ksa_payment_entry: values.ksa_payment_entry,
      transfer_date: values.transfer_date,
      reference_no: values.reference_no || null,
      withholding_tax: Number(values.withholding_tax) || 0,
      rows: chosen,
    })
    toast.success(__('Transfer {0} submitted', [result.name]))
    emit('saved', result)
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
