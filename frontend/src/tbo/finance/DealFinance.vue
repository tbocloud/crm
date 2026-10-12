<template>
  <div class="flex h-full w-full flex-col overflow-y-auto">
    <div
      v-if="finance.loading && !data"
      class="flex flex-1 items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
    >
      <LoadingIndicator class="size-4" />
      {{ __('Loading...') }}
    </div>

    <StateMessage
      v-else-if="finance.error && isPermissionError(finance.error)"
      :icon="LucideLock"
      :title="__('Not permitted')"
      :description="__('You cannot see the finance of this deal.')"
    />

    <StateMessage
      v-else-if="finance.error"
      role="alert"
      :icon="LucideCircleAlert"
      :title="__('Could not load the finance')"
      :description="errorMessage(finance.error)"
    >
      <Button :label="__('Try again')" @click="reload" />
    </StateMessage>

    <div v-else-if="data" class="flex flex-col gap-6 px-3 pb-6 pt-4 sm:px-10">
      <!-- Stage and the two steps a person sets -->
      <section class="flex flex-col gap-3" :aria-label="__('Stage')">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <StageStrip :stages="data.stages" :current="data.stage" />
          <div class="flex flex-wrap items-center gap-2">
            <Button
              v-if="data.can_set_onboarding && !data.closed"
              :label="
                data.onboarding_complete
                  ? __('Onboarding complete')
                  : __('Mark onboarding complete')
              "
              :iconLeft="
                data.onboarding_complete ? LucideCircleCheck : LucideCircle
              "
              :aria-pressed="Boolean(data.onboarding_complete)"
              :loading="busy === 'onboarding'"
              :disabled="Boolean(busy)"
              @click="toggleOnboarding"
            />
            <Button
              v-if="
                data.can_close && (data.closed || data.stage === 'Collected')
              "
              :label="data.closed ? __('Reopen') : __('Close finance')"
              :iconLeft="data.closed ? LucideLockOpen : LucideLock"
              :loading="busy === 'close'"
              :disabled="Boolean(busy)"
              @click="toggleClosed"
            />
          </div>
        </div>
        <p class="text-p-sm text-ink-gray-6">
          {{ __('Company') }}:
          <span class="text-ink-gray-8">{{
            data.company || __('not set')
          }}</span>
          <template v-if="data.customer">
            · {{ __('Customer') }}:
            <span class="text-ink-gray-8">{{ data.customer }}</span>
          </template>
        </p>
      </section>

      <!-- Totals per currency -->
      <section
        v-if="data.amounts_visible && data.totals.length"
        :aria-label="__('Totals')"
        class="flex flex-col gap-2"
      >
        <dl
          v-for="total in data.totals"
          :key="total.currency"
          class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-outline-gray-2 bg-outline-gray-2 sm:grid-cols-4"
        >
          <div
            v-for="cell in totalCells(total)"
            :key="cell.label"
            class="flex flex-col gap-1 bg-surface-base px-4 py-3"
          >
            <dt class="text-p-sm text-ink-gray-6">{{ cell.label }}</dt>
            <dd
              class="flex items-center gap-1.5 whitespace-nowrap font-mono text-base font-semibold tabular-nums sm:text-lg"
              :class="cell.danger ? 'text-danger' : 'text-ink-gray-9'"
            >
              <LucideCircleAlert
                v-if="cell.danger"
                class="size-4"
                aria-hidden="true"
              />
              {{ money(cell.value, total.currency) }}
            </dd>
          </div>
        </dl>
      </section>
      <p
        v-else-if="
          !data.amounts_visible &&
          (data.invoices.length || data.payments.length)
        "
        class="rounded border border-outline-gray-2 px-3 py-2 text-p-sm text-ink-gray-6"
      >
        {{
          __(
            'Invoice and payment amounts are visible to managers and accounts only.',
          )
        }}
      </p>

      <!-- Quotations -->
      <FinanceSection
        :title="__('Quotations')"
        :count="data.quotations.length"
        :empty="__('No quotations yet.')"
      >
        <template #actions>
          <Button
            variant="solid"
            :label="__('New quotation')"
            :iconLeft="LucidePlus"
            @click="openQuotation('')"
          />
        </template>
        <li
          v-for="row in data.quotations"
          :key="row.name"
          class="flex flex-col gap-1 py-3"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              :href="row.url"
              target="_blank"
              rel="noopener noreferrer"
              class="font-mono text-base font-medium text-ink-gray-9 underline-offset-2 hover:underline"
            >
              {{ row.name }}
            </a>
            <Badge
              :label="__(row.status)"
              :theme="statusTone(row.status)"
              variant="subtle"
              size="sm"
            />
            <span class="text-p-sm text-ink-gray-6">
              {{
                row.valid_till
                  ? __('Valid till {0}', [date(row.valid_till)])
                  : date(row.transaction_date)
              }}
            </span>
            <span
              class="ml-auto font-mono text-base tabular-nums text-ink-gray-8"
            >
              {{ money(row.grand_total, row.currency) }}
            </span>
          </div>
          <div v-if="row.docstatus === 0" class="flex flex-wrap gap-2">
            <Button
              size="sm"
              :label="__('Edit')"
              :iconLeft="LucidePencil"
              @click="openQuotation(row.name, row.url)"
            />
            <Button
              size="sm"
              :label="__('Submit')"
              :iconLeft="LucideSend"
              :loading="busy === row.name"
              :disabled="Boolean(busy)"
              @click="confirmSubmit(row)"
            />
          </div>
          <!-- TBO: discount/commission approval chips (docs/tbo-quotation-approvals.md) -->
          <QuotationAdjustments
            :quotation="row.name"
            :status="adjustments.statusFor(row.name)"
            :access="adjustments.access.value"
            @changed="adjustments.reload()"
          />
        </li>
      </FinanceSection>

      <!-- Sales orders -->
      <FinanceSection
        :title="__('Sales orders')"
        :count="data.orders.length"
        :empty="
          __(
            'No sales orders yet. The client accepts a quotation as a sales order in ERPNext.',
          )
        "
      >
        <li
          v-for="row in data.orders"
          :key="row.name"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 py-3"
        >
          <a
            :href="row.url"
            target="_blank"
            rel="noopener noreferrer"
            class="font-mono text-base font-medium text-ink-gray-9 underline-offset-2 hover:underline"
            >{{ row.name }}</a
          >
          <Badge
            :label="__(row.status)"
            :theme="statusTone(row.status)"
            variant="subtle"
            size="sm"
          />
          <span class="text-p-sm text-ink-gray-6">
            {{
              [
                date(row.transaction_date),
                row.delivery_date &&
                  __('Delivery {0}', [date(row.delivery_date)]),
              ]
                .filter(Boolean)
                .join(' · ')
            }}
          </span>
          <span
            v-if="data.amounts_visible"
            class="ml-auto text-right font-mono text-base tabular-nums text-ink-gray-8"
          >
            {{ money(row.grand_total, row.currency) }}
            <span v-if="row.advance_paid" class="block text-xs text-ink-gray-6">
              {{ __('Advance {0}', [money(row.advance_paid, row.currency)]) }}
            </span>
          </span>
        </li>
      </FinanceSection>

      <!-- Invoices with their payment terms -->
      <FinanceSection
        :title="__('Invoices')"
        :count="data.invoices.length"
        :empty="__('No invoices yet.')"
      >
        <li v-for="row in data.invoices" :key="row.name" class="py-3">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              :href="row.url"
              target="_blank"
              rel="noopener noreferrer"
              class="font-mono text-base font-medium text-ink-gray-9 underline-offset-2 hover:underline"
              >{{ row.name }}</a
            >
            <Badge
              :label="__(row.status)"
              :theme="statusTone(row.status)"
              variant="subtle"
              size="sm"
            />
            <span class="text-p-sm text-ink-gray-6">
              {{ date(row.posting_date) }} ·
              {{ __('Due {0}', [date(row.due_date)]) }}
            </span>
            <dl
              v-if="data.amounts_visible"
              class="ml-auto grid grid-cols-2 gap-x-4 text-right font-mono text-base tabular-nums"
            >
              <dt class="sr-only">{{ __('Grand total') }}</dt>
              <dd class="text-ink-gray-8">
                {{ money(row.rounded_total || row.grand_total, row.currency) }}
              </dd>
              <dt class="sr-only">{{ __('Outstanding') }}</dt>
              <dd
                :class="
                  row.outstanding_amount > 0
                    ? 'text-ink-gray-9 font-semibold'
                    : 'text-ink-gray-6'
                "
              >
                {{
                  __('{0} due', [money(row.outstanding_amount, row.currency)])
                }}
              </dd>
            </dl>
          </div>
          <details v-if="row.terms.length" class="mt-2 group">
            <summary
              class="w-fit cursor-pointer rounded text-p-sm text-ink-gray-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
            >
              {{ __('{0} payment terms', [row.terms.length]) }}
            </summary>
            <ul
              class="mt-2 flex flex-col divide-y divide-outline-gray-1 rounded border border-outline-gray-2"
            >
              <li
                v-for="(term, i) in row.terms"
                :key="i"
                class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-p-sm"
              >
                <span class="text-ink-gray-8">{{
                  term.payment_term || __('Term {0}', [i + 1])
                }}</span>
                <span class="text-ink-gray-6">{{
                  __('Due {0}', [date(term.due_date)])
                }}</span>
                <span
                  v-if="isTermOverdue(term, today)"
                  class="inline-flex items-center gap-1 text-danger"
                >
                  <LucideCircleAlert class="size-3.5" aria-hidden="true" />{{
                    __('Overdue')
                  }}
                </span>
                <span
                  v-if="data.amounts_visible"
                  class="ml-auto font-mono tabular-nums text-ink-gray-8"
                >
                  {{ money(term.payment_amount, row.currency) }}
                  <span class="text-ink-gray-6"
                    >·
                    {{
                      __('{0} open', [money(term.outstanding, row.currency)])
                    }}</span
                  >
                </span>
              </li>
            </ul>
          </details>
        </li>
      </FinanceSection>

      <!-- Payments received -->
      <FinanceSection
        :title="__('Payments received')"
        :count="data.payments.length"
        :empty="__('No payments yet.')"
      >
        <li
          v-for="row in data.payments"
          :key="row.name"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 py-3"
        >
          <a
            :href="row.url"
            target="_blank"
            rel="noopener noreferrer"
            class="font-mono text-base font-medium text-ink-gray-9 underline-offset-2 hover:underline"
            >{{ row.name }}</a
          >
          <span class="text-p-sm text-ink-gray-6">
            {{
              [date(row.posting_date), row.mode_of_payment, row.reference_no]
                .filter(Boolean)
                .join(' · ')
            }}
          </span>
          <span
            v-if="row.payment_type === 'Pay'"
            class="text-p-sm text-ink-gray-6"
            >{{ __('Refund') }}</span
          >
          <span
            v-if="data.amounts_visible"
            class="ml-auto font-mono text-base tabular-nums text-ink-gray-8"
          >
            {{ money(row.amount, row.currency) }}
          </span>
        </li>
      </FinanceSection>

      <!-- Follow-ups (CRM tasks on the deal) -->
      <FinanceSection
        :title="__('Follow-ups')"
        :count="data.follow_ups.length"
        :empty="__('No open follow-ups.')"
      >
        <li
          v-for="(task, i) in data.follow_ups"
          :key="task.name"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 py-3"
        >
          <span class="text-base text-ink-gray-9">{{ task.title }}</span>
          <span
            v-if="i === 0 && task.due_date"
            class="text-p-sm font-medium text-ink-gray-7"
            >{{ __('Next') }}</span
          >
          <span class="text-p-sm text-ink-gray-6">{{ __(task.status) }}</span>
          <span
            class="ml-auto inline-flex items-center gap-1 text-p-sm"
            :class="
              task.due_date && task.due_date.slice(0, 10) < today
                ? 'text-danger'
                : 'text-ink-gray-6'
            "
          >
            <LucideCircleAlert
              v-if="task.due_date && task.due_date.slice(0, 10) < today"
              class="size-3.5"
              aria-hidden="true"
            />
            {{
              task.due_date
                ? __('Due {0}', [date(task.due_date)])
                : __('No due date')
            }}
          </span>
        </li>
      </FinanceSection>
      <!-- Allocation (Phase 3) and Exceptions (Phase 4) join here, for accounts only. -->
    </div>

    <QuotationDialog
      v-model="showQuotation"
      :deal="deal"
      :quotation="editing.name"
      :erpnext-url="editing.url"
      @saved="reload"
    />
  </div>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { formatDate } from '@/utils'
import { formatCurrency } from '@/utils/numberFormat.js'
import { globalStore } from '@/stores/global'
import StateMessage from '@/tbo/quotationApprovals/StateMessage.vue'
import QuotationAdjustments from '@/tbo/quotationApprovals/QuotationAdjustments.vue'
import { useQuotationAdjustments } from '@/tbo/quotationApprovals/useQuotationAdjustments'
import { Badge, createResource, toast } from 'frappe-ui'
import { computed, ref } from 'vue'
import LucideCircle from '~icons/lucide/circle'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideCircleCheck from '~icons/lucide/circle-check'
import LucideLock from '~icons/lucide/lock'
import LucideLockOpen from '~icons/lucide/lock-open'
import LucidePencil from '~icons/lucide/pencil'
import LucidePlus from '~icons/lucide/plus'
import LucideSend from '~icons/lucide/send'
import FinanceSection from './FinanceSection.vue'
import QuotationDialog from './QuotationDialog.vue'
import StageStrip from './StageStrip.vue'
import {
  errorMessage,
  load,
  methods,
  setClosed,
  setOnboarding,
  submitQuotation,
  useDealFinanceRefresh,
} from './api'
import {
  isPermissionError,
  isTermOverdue,
  localToday,
  statusTone,
} from './finance'

const props = defineProps({
  deal: { type: String, required: true },
})

const { $dialog } = globalStore()
const today = localToday()
const busy = ref('')
const showQuotation = ref(false)
const editing = ref({ name: '', url: '' })

const finance = createResource({ url: methods.deal })
const data = computed(() => finance.data || null)
function reload() {
  load(finance, { deal: props.deal })
}
reload()
useDealFinanceRefresh(() => props.deal, reload)

const adjustments = useQuotationAdjustments(() =>
  (data.value?.quotations || []).map((row) => row.name),
)

function money(value, currency) {
  if (value === null || value === undefined) return '—'
  return formatCurrency(value, '', currency)
}

function date(value) {
  return value ? formatDate(value, '', true) : '—'
}

function totalCells(total) {
  return [
    { label: __('Invoiced'), value: total.invoiced },
    { label: __('Received'), value: total.received },
    { label: __('Outstanding'), value: total.outstanding },
    { label: __('Overdue'), value: total.overdue, danger: total.overdue > 0 },
  ]
}

function openQuotation(name, url = '') {
  editing.value = { name, url }
  showQuotation.value = true
}

async function run(key, action, success) {
  // one finance action at a time: each one changes what the next would act on
  if (busy.value) return
  busy.value = key
  try {
    await action()
    if (success) toast.success(success)
    reload()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = ''
  }
}

function toggleOnboarding() {
  const next = !data.value.onboarding_complete
  run(
    'onboarding',
    () => setOnboarding(props.deal, next),
    next ? __('Onboarding marked complete') : __('Onboarding reopened'),
  )
}

function toggleClosed() {
  const next = !data.value.closed
  run(
    'close',
    () => setClosed(props.deal, next),
    next ? __('Finance closed') : __('Finance reopened'),
  )
}

function confirmSubmit(row) {
  $dialog({
    title: __('Submit {0}?', [row.name]),
    message: __(
      'A submitted quotation can no longer be edited. The client can then accept it as a sales order.',
    ),
    actions: [
      {
        label: __('Submit'),
        variant: 'solid',
        onClick: (close) => {
          close()
          run(
            row.name,
            () => submitQuotation(props.deal, row.name),
            __('Quotation {0} submitted', [row.name]),
          ).then(() => adjustments.reload())
        },
      },
    ],
  })
}
</script>
