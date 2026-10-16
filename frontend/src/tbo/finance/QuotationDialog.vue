<template>
  <Dialog
    v-model:open="open"
    :title="
      reviewing
        ? __('Review quotation')
        : quotation
          ? __('Edit quotation')
          : __('New quotation')
    "
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

      <!-- review: what the client will get, before the draft is saved -->
      <div v-else-if="values && reviewing" class="flex flex-col gap-5">
        <p class="-mt-2 text-p-base text-ink-gray-7">
          {{ __('For') }}
          <span class="font-medium text-ink-gray-9">{{
            values.party?.label
          }}</span>
          · {{ __('valid till') }}
          <span class="font-mono tabular-nums text-ink-gray-9">{{
            values.valid_till
          }}</span>
        </p>
        <div class="overflow-x-auto rounded border border-outline-gray-2">
          <table class="w-full min-w-[32rem] text-p-sm">
            <thead class="text-left text-xs text-ink-gray-6">
              <tr class="border-b border-outline-gray-2">
                <th class="px-3 py-2 font-normal">{{ __('Service') }}</th>
                <th class="px-3 py-2 text-right font-normal">
                  {{ __('Qty') }}
                </th>
                <th class="px-3 py-2 text-right font-normal">
                  {{ __('Rate') }}
                </th>
                <th class="px-3 py-2 text-right font-normal">
                  {{ __('Disc. %') }}
                </th>
                <th class="px-3 py-2 text-right font-normal">
                  {{ __('Amount') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in values.items"
                :key="row.key"
                class="border-b border-outline-gray-1 last:border-0"
              >
                <td class="px-3 py-2 text-ink-gray-8">
                  <div class="font-medium">
                    {{ row.item_name || row.item_code }}
                  </div>
                  <div v-if="row.description" class="text-ink-gray-6">
                    {{ row.description }}
                  </div>
                </td>
                <td class="px-3 py-2 text-right font-mono tabular-nums">
                  {{ row.qty }}
                </td>
                <td class="px-3 py-2 text-right font-mono tabular-nums">
                  {{ money(row.price_list_rate) }}
                </td>
                <td class="px-3 py-2 text-right font-mono tabular-nums">
                  {{ Number(row.discount_percentage) || 0 }}
                </td>
                <td class="px-3 py-2 text-right font-mono tabular-nums">
                  {{ money(lineAmounts(row).amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <TotalsBlock
          :totals="totals"
          :money="money"
          :tax-label="values.taxes_and_charges"
        />
        <dl class="grid grid-cols-1 gap-x-6 gap-y-2 text-p-sm sm:grid-cols-2">
          <div v-if="values.payment_terms_template">
            <dt class="text-ink-gray-5">{{ __('Payment terms') }}</dt>
            <dd class="text-ink-gray-8">{{ values.payment_terms_template }}</dd>
          </div>
          <div v-if="values.terms" class="sm:col-span-2">
            <dt class="text-ink-gray-5">{{ __('Terms') }}</dt>
            <dd class="whitespace-pre-line text-ink-gray-8">
              {{ stripHtml(values.terms) }}
            </dd>
          </div>
        </dl>
        <p
          v-if="limitWarning"
          class="flex items-start gap-1.5 text-p-sm text-warning"
        >
          <LucideTriangleAlert
            class="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          {{ limitWarning }}
        </p>
      </div>

      <form
        v-else-if="values"
        :id="formId"
        class="flex flex-col gap-5"
        novalidate
        @submit.prevent="next"
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

        <!-- the lead's catalogue: a package fills its lines; a service adds one -->
        <div
          v-if="catalogue"
          class="flex flex-col gap-2 rounded-lg border border-outline-gray-2 p-3 sm:flex-row sm:items-end"
        >
          <FormControl
            :model-value="values.package || ''"
            class="sm:w-64"
            type="select"
            :label="__('Package')"
            :options="packageOptions"
            @update:model-value="pickPackage"
          />
          <Combobox
            :model-value="null"
            :options="serviceOptions"
            :placeholder="__('Add a service')"
            @update:selected-option="
              (option) => option && addService(option.value)
            "
          >
            <template #trigger="{ open: listOpen, setOpen }">
              <Button
                :label="__('Add a service')"
                :iconLeft="LucidePlus"
                @click="setOpen(!listOpen)"
              />
            </template>
          </Combobox>
          <p
            v-if="packageDuration"
            class="text-p-sm text-ink-gray-6 sm:ml-auto"
          >
            {{ __('Project duration') }}: {{ packageDuration }}
          </p>
        </div>

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
                v-if="
                  row.item_name && row.item_name !== row.item_code && !catalogue
                "
                class="mt-1 truncate text-xs text-ink-gray-6"
              >
                {{ row.item_name }}
              </p>
              <FormControl
                v-if="catalogue"
                v-model="row.description"
                class="mt-1"
                size="sm"
                :placeholder="row.item_name || __('Description for the client')"
                :aria-label="__('Description, row {0}', [i + 1])"
              />
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
          <TotalsBlock
            :totals="totals"
            :money="money"
            :tax-label="values.taxes_and_charges"
          />
        </div>

        <div
          v-if="paymentTermsOptions.length > 1 || termsOptions.length > 1"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <FormControl
            v-model="values.payment_terms_template"
            type="select"
            :label="__('Payment terms')"
            :options="paymentTermsOptions"
          />
          <FormControl
            :model-value="values.tc_name || ''"
            type="select"
            :label="__('Terms template')"
            :options="termsOptions"
            @update:model-value="pickTerms"
          />
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
          <Button
            v-if="reviewing"
            :label="__('Back')"
            @click="reviewing = false"
          />
          <Button v-else :label="__('Cancel')" @click="open = false" />
          <Button
            v-if="reviewing"
            variant="solid"
            :label="__('Save draft')"
            :loading="saving"
            @click="save"
          />
          <Button
            v-else
            variant="solid"
            type="submit"
            :form="formId"
            :label="lead ? __('Review') : __('Save draft')"
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
import { leadQuotationMethods, saveLeadQuotation } from '@/tbo/leadPipeline/api'
import { Combobox, Dialog, FormControl, createResource, toast } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import LucidePlus from '~icons/lucide/plus'
import LucideTrash2 from '~icons/lucide/trash-2'
import LucideExternalLink from '~icons/lucide/external-link'
import LucideTriangleAlert from '~icons/lucide/triangle-alert'
import NumberField from './NumberField.vue'
import TotalsBlock from './TotalsBlock.vue'
import { errorMessage, getItemPrice, load, methods, saveQuotation } from './api'
import {
  lineAmounts,
  localToday,
  quotationPayload,
  quotationTotals,
  validateQuotation,
} from './finance'

const props = defineProps({
  // the deal's Finance tab, or the lead's Quotations tab (one of the two)
  deal: { type: String, default: '' },
  lead: { type: String, default: '' },
  // a draft to edit; empty for a new quotation
  quotation: { type: String, default: '' },
  // the lead meeting a new quotation comes from
  meeting: { type: String, default: '' },
  erpnextUrl: { type: String, default: '' },
})
const emit = defineEmits(['saved'])

const open = defineModel({ type: Boolean })
const formId = `tbo-quotation-${Math.random().toString(36).slice(2, 8)}`
const values = ref(null)
const errors = ref({})
const error = ref('')
const saving = ref(false)
const reviewing = ref(false)
let rowKey = 0

const { access: approvalAccess } = useApprovalAccess()
const form = createResource({
  url: props.lead ? leadQuotationMethods.form : methods.quotationForm,
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
    reviewing.value = false
    load(
      form,
      props.lead
        ? {
            lead: props.lead,
            quotation: props.quotation || null,
            meeting: props.meeting || null,
          }
        : { deal: props.deal, quotation: props.quotation || null },
    )
  },
  { immediate: true },
)

const catalogue = computed(() => values.value?.catalogue || null)
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
const paymentTermsOptions = computed(() => [
  { label: __('None'), value: '' },
  ...(values.value?.payment_terms_templates || []).map((name) => ({
    label: name,
    value: name,
  })),
])
const termsOptions = computed(() => [
  { label: __('None'), value: '' },
  ...(values.value?.terms_templates || []).map((name) => ({
    label: name,
    value: name,
  })),
])
const packageOptions = computed(() => [
  { label: __('No package'), value: '' },
  ...(catalogue.value?.packages || []).map((row) => ({
    label: row.package_name,
    value: row.name,
  })),
])
// services grouped by category (Item Group)
const serviceOptions = computed(() => {
  const groups = {}
  for (const row of catalogue.value?.services || []) {
    const group = row.item_group || __('Other')
    ;(groups[group] ||= []).push({
      label: row.item_name || row.item_code,
      value: row.item_code,
    })
  }
  return Object.entries(groups).map(([group, options]) => ({ group, options }))
})
const packageDuration = computed(
  () =>
    (catalogue.value?.packages || []).find(
      (row) => row.name === values.value?.package,
    )?.project_duration || '',
)
const totals = computed(() =>
  values.value
    ? quotationTotals(
        values.value.items,
        values.value.additional_discount_percentage,
        values.value.tax_rates?.[values.value.taxes_and_charges] || 0,
      )
    : quotationTotals([]),
)

function money(value) {
  return formatCurrency(value, '', values.value?.currency)
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function limitHint(kind) {
  const access = approvalAccess.value
  if (!access?.enabled || !access.kinds?.includes(kind)) return ''
  return __('Your limit: {0}. Above it, the quotation needs approval.', [
    access.limit_labels?.[kind] || __('not set'),
  ])
}

// on the review step: a discount above the user's limit needs approval later
const limitWarning = computed(() => {
  const access = approvalAccess.value
  const limit = access?.limits?.Discount
  if (!access?.enabled || limit === null || limit === undefined) return ''
  const percent = totals.value.subtotal
    ? (totals.value.discount / totals.value.subtotal) * 100
    : 0
  return percent > limit
    ? __(
        'The discount is above your limit: request approval before you send it.',
      )
    : ''
})

function newRow(fields = {}) {
  return {
    key: ++rowKey,
    item_code: '',
    item_name: '',
    qty: 1,
    price_list_rate: 0,
    discount_percentage: 0,
    ...(catalogue.value ? { description: '' } : {}),
    ...fields,
  }
}

function addItem() {
  values.value.items.push(newRow())
}

function addService(itemCode) {
  const service = (catalogue.value?.services || []).find(
    (row) => row.item_code === itemCode,
  )
  if (!service) return
  values.value.items.push(
    newRow({
      item_code: service.item_code,
      item_name: service.item_name,
      price_list_rate: service.rate,
      description: service.description || '',
    }),
  )
}

// A package fills the lines of a quotation that has none, or adds after them.
function pickPackage(name) {
  values.value.package = name || ''
  const preset = (catalogue.value?.packages || []).find(
    (row) => row.name === name,
  )
  if (!preset) return
  const services = Object.fromEntries(
    (catalogue.value?.services || []).map((row) => [row.item_code, row]),
  )
  const filled = values.value.items.filter((row) => row.item_code)
  values.value.items = [
    ...filled,
    ...preset.items.map((row) =>
      newRow({
        item_code: row.item_code,
        item_name: services[row.item_code]?.item_name || row.item_code,
        qty: row.qty,
        price_list_rate: row.rate,
        description: row.description || '',
      }),
    ),
  ]
}

function pickTerms(name) {
  values.value.tc_name = name || ''
  if (!name) return
  // the server fills the text from the template when Terms is left empty
  values.value.terms = ''
}

async function pickItem(row, code) {
  // a new item never keeps the previous item's name or price
  row.item_code = code
  row.item_name = ''
  row.price_list_rate = 0
  if (!code) return
  try {
    const item = await getItemPrice(code, values.value.company)
    // ignore a late answer for an item the row no longer has
    if (row.item_code !== code) return
    row.item_name = item.item_name
    row.price_list_rate = item.price_list_rate
  } catch (e) {
    if (row.item_code === code) error.value = errorMessage(e)
  }
}

// The lead's builder reviews before it saves; the deal's dialog saves at once.
function next() {
  errors.value = validateQuotation(values.value, localToday())
  if (Object.keys(errors.value).length) return
  if (props.lead) reviewing.value = true
  else save()
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const payload = quotationPayload(values.value)
    const saved = props.lead
      ? await saveLeadQuotation(props.lead, payload, props.quotation)
      : await saveQuotation(props.deal, payload, props.quotation)
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
    reviewing.value = false
  } finally {
    saving.value = false
  }
}
</script>
