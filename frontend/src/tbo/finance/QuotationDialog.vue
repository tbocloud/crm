<template>
  <Dialog
    v-model:open="open"
    :title="quotation ? __('Edit quotation') : __('New quotation')"
    size="4xl"
  >
    <template #default>
      <div
        v-if="form.loading && !values"
        class="flex items-center justify-center gap-2 py-12 text-base text-ink-gray-6"
      >
        <LoadingIndicator class="size-4" />
        {{ __('Loading...') }}
      </div>
      <p v-else-if="form.error" role="alert" class="text-p-base text-danger">
        {{ errorMessage(form.error) }}
      </p>
      <form
        v-else-if="values"
        :id="formId"
        class="flex flex-col gap-5"
        novalidate
        @submit.prevent="save"
      >
        <p class="-mt-2 text-p-base text-ink-gray-7">
          {{ __('For') }}
          <span class="font-medium text-ink-gray-9">
            {{ values.party?.label }}
          </span>
          <template v-if="quotation">
            ·
            <span class="font-mono text-ink-gray-9">{{ quotation }}</span>
          </template>
        </p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormControl
            v-model="values.company"
            type="select"
            :label="__('Company')"
            :options="companyOptions"
            :disabled="Boolean(quotation)"
          />
          <FormControl
            v-model="values.valid_till"
            type="date"
            :label="__('Valid till')"
          />
          <FormControl
            v-model="values.taxes_and_charges"
            type="select"
            :label="__('Taxes')"
            :options="taxOptions"
          />
        </div>
        <p
          v-if="errors.valid_till"
          role="alert"
          class="-mt-3 text-p-sm text-danger"
        >
          {{ errors.valid_till }}
        </p>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-2 text-base font-medium text-ink-gray-9">
            {{ __('Items') }}
          </legend>
          <div
            class="hidden grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_9rem_2rem] gap-2 px-1 text-xs text-ink-gray-6 sm:grid"
            aria-hidden="true"
          >
            <span>{{ __('Item') }}</span>
            <span class="text-right">{{ __('Qty') }}</span>
            <span class="text-right">{{ __('Rate') }}</span>
            <span class="text-right">{{ __('Disc. %') }}</span>
            <span class="text-right">{{ __('Amount') }}</span>
            <span />
          </div>
          <div
            v-for="(row, i) in values.items"
            :key="row.key"
            class="relative grid grid-cols-2 gap-2 rounded border border-outline-gray-2 p-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_9rem_2rem] sm:items-start sm:border-0 sm:p-0"
          >
            <div class="col-span-2 pr-9 sm:col-span-1 sm:pr-0">
              <Link
                :value="row.item_code"
                doctype="Item"
                :filters="{ is_sales_item: 1, disabled: 0 }"
                :placeholder="__('Choose an item')"
                :aria-label="__('Item, row {0}', [i + 1])"
                @change="(code) => pickItem(row, code)"
              />
              <p
                v-if="row.item_name && row.item_name !== row.item_code"
                class="mt-1 truncate text-xs text-ink-gray-6"
              >
                {{ row.item_name }}
              </p>
              <p
                v-if="errors[`items.${i}.item_code`]"
                role="alert"
                class="mt-1 text-xs text-danger"
              >
                {{ errors[`items.${i}.item_code`] }}
              </p>
            </div>
            <NumberField
              v-model="row.qty"
              :label="__('Qty')"
              :error="errors[`items.${i}.qty`]"
              min="0"
              step="any"
            />
            <NumberField
              v-model="row.price_list_rate"
              :label="__('Rate')"
              :error="errors[`items.${i}.price_list_rate`]"
              min="0"
              step="0.01"
            />
            <NumberField
              v-model="row.discount_percentage"
              :label="__('Disc. %')"
              :error="errors[`items.${i}.discount_percentage`]"
              min="0"
              max="100"
              step="0.01"
            />
            <div
              class="col-span-2 flex h-7 items-center justify-end gap-2 whitespace-nowrap border-t border-outline-gray-1 pt-2 sm:col-span-1 sm:border-0 sm:pt-0 font-mono text-base tabular-nums text-ink-gray-8"
            >
              <span class="mr-auto text-xs text-ink-gray-6 sm:hidden">
                {{ __('Amount') }}
              </span>
              {{ money(lineAmounts(row).amount) }}
            </div>
            <div class="absolute right-2 top-2 flex justify-end sm:static">
              <Button
                variant="ghost"
                :icon="LucideTrash2"
                :aria-label="__('Remove row {0}', [i + 1])"
                @click="values.items.splice(i, 1)"
              />
            </div>
          </div>
          <p v-if="errors.items" role="alert" class="text-p-sm text-danger">
            {{ errors.items }}
          </p>
          <div>
            <Button
              :label="__('Add item')"
              :iconLeft="LucidePlus"
              @click="addItem"
            />
          </div>
        </fieldset>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <NumberField
              v-model="values.additional_discount_percentage"
              :label="__('Additional discount %')"
              :error="errors.additional_discount_percentage"
              show-label
              min="0"
              max="100"
              step="0.01"
            />
            <p class="mt-1.5 text-p-sm text-ink-gray-6">
              {{ limitHint('Discount') }}
            </p>
          </div>
          <div>
            <NumberField
              v-model="values.commission"
              :label="__('Commission %')"
              :error="errors.commission"
              show-label
              min="0"
              max="100"
              step="0.01"
            />
            <p class="mt-1.5 text-p-sm text-ink-gray-6">
              {{ limitHint('Commission') }}
            </p>
          </div>
          <div class="flex flex-col justify-end text-right">
            <span class="text-p-sm text-ink-gray-6">
              {{ __('Net total before taxes') }}
            </span>
            <span
              class="font-mono text-xl font-semibold tabular-nums text-ink-gray-9"
            >
              {{ money(netTotal) }}
            </span>
          </div>
        </div>

        <FormControl
          v-model="values.terms"
          type="textarea"
          :label="__('Terms')"
          :rows="3"
          :placeholder="__('Payment terms, scope or notes for the client')"
        />
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
        <div class="flex flex-wrap items-center justify-end gap-2">
          <a
            v-if="quotation && erpnextUrl"
            :href="erpnextUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mr-auto inline-flex items-center gap-1 rounded text-base text-ink-gray-7 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
          >
            {{ __('Open in ERPNext') }}
            <LucideExternalLink class="size-3.5" aria-hidden="true" />
          </a>
          <Button :label="__('Cancel')" @click="open = false" />
          <Button
            variant="solid"
            type="submit"
            :form="formId"
            :label="__('Save draft')"
            :loading="saving"
            :disabled="!values"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import Link from '@/components/Controls/Link.vue'
import { formatCurrency } from '@/utils/numberFormat.js'
import { useApprovalAccess } from '@/tbo/quotationApprovals/api'
import { Dialog, FormControl, createResource, toast } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import LucidePlus from '~icons/lucide/plus'
import LucideTrash2 from '~icons/lucide/trash-2'
import LucideExternalLink from '~icons/lucide/external-link'
import NumberField from './NumberField.vue'
import { errorMessage, getItemPrice, load, methods, saveQuotation } from './api'
import {
  lineAmounts,
  quotationNetTotal,
  quotationPayload,
  validateQuotation,
} from './finance'

const props = defineProps({
  deal: { type: String, required: true },
  // a draft of this deal to edit; empty for a new quotation
  quotation: { type: String, default: '' },
  erpnextUrl: { type: String, default: '' },
})
const emit = defineEmits(['saved'])

const open = defineModel({ type: Boolean })
const formId = `tbo-quotation-${Math.random().toString(36).slice(2, 8)}`
const values = ref(null)
const errors = ref({})
const error = ref('')
const saving = ref(false)
let rowKey = 0

const { access: approvalAccess } = useApprovalAccess()
const form = createResource({
  url: methods.quotationForm,
  onSuccess(data) {
    values.value = {
      ...data,
      items: (data.items || []).map((row) => ({ ...row, key: ++rowKey })),
    }
  },
})

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    values.value = null
    errors.value = {}
    error.value = ''
    load(form, { deal: props.deal, quotation: props.quotation || null })
  },
  { immediate: true },
)

const companyOptions = computed(() =>
  (values.value?.companies || []).map((name) => ({ label: name, value: name })),
)
const taxOptions = computed(() => [
  { label: __('No taxes'), value: '' },
  ...(values.value?.tax_templates || []).map((name) => ({
    label: name,
    value: name,
  })),
])
const netTotal = computed(() =>
  values.value
    ? quotationNetTotal(
        values.value.items,
        values.value.additional_discount_percentage,
      )
    : 0,
)

function money(value) {
  return formatCurrency(value, '', values.value?.currency)
}

function limitHint(kind) {
  const access = approvalAccess.value
  if (!access?.enabled || !access.kinds?.includes(kind)) return ''
  return __('Your limit: {0}. Above it, the quotation needs approval.', [
    access.limit_labels?.[kind] || __('not set'),
  ])
}

function addItem() {
  values.value.items.push({
    key: ++rowKey,
    item_code: '',
    item_name: '',
    qty: 1,
    price_list_rate: 0,
    discount_percentage: 0,
  })
}

async function pickItem(row, code) {
  row.item_code = code
  try {
    const item = await getItemPrice(code, values.value.company)
    row.item_name = item.item_name
    if (!Number(row.price_list_rate)) row.price_list_rate = item.price_list_rate
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function save() {
  errors.value = validateQuotation(
    values.value,
    new Date().toISOString().slice(0, 10),
  )
  if (Object.keys(errors.value).length) return
  saving.value = true
  error.value = ''
  try {
    const saved = await saveQuotation(
      props.deal,
      quotationPayload(values.value),
      props.quotation,
    )
    toast.success(
      props.quotation
        ? __('Quotation {0} saved', [saved.name])
        : __('Draft quotation {0} created', [saved.name]),
    )
    if (saved.needs_approval?.length) {
      toast.warning(
        __('Above your limit: request approval before you submit it.'),
      )
    }
    emit('saved', saved)
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
