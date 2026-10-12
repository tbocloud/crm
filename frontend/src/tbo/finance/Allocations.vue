<template>
  <LayoutHeader>
    <template #left-header>
      <Breadcrumbs
        :items="[
          {
            label: __('Allocations & transfers'),
            route: { name: 'Allocations' },
          },
        ]"
      />
    </template>
    <template v-if="allocationsOn" #right-header>
      <Button
        v-if="summary.data?.can_transfer"
        variant="solid"
        :label="__('New transfer')"
        :iconLeft="LucideSend"
        @click="showTransfer = true"
      />
      <Button
        :label="__('Refresh')"
        :iconLeft="LucideRefreshCw"
        :loading="summary.loading"
        @click="reload"
      />
    </template>
  </LayoutHeader>

  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <div
        v-if="accessLoading"
        class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
      >
        <LoadingIndicator class="size-4" />
        {{ __('Loading...') }}
      </div>

      <StateMessage
        v-else-if="!allocationsOn"
        :icon="LucideArrowLeftRight"
        :title="__('Allocations are not switched on, or not for you')"
        :description="
          __(
            'Accounts, finance and management see this page once TBO Smart Settings → Allocation and transfers is on.',
          )
        "
      />

      <template v-else>
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold text-ink-gray-9">
              {{ __('Allocations & transfers') }}
            </h1>
            <p v-if="summary.data" class="mt-1 text-p-sm text-ink-gray-6">
              {{
                __(
                  '{0}% of each net receipt of {1} is payable to {2}, from {3}. Memo only: nothing is posted to the accounts.',
                  [
                    summary.data.percent,
                    summary.data.company,
                    summary.data.partner_company,
                    date(summary.data.start_date),
                  ],
                )
              }}
            </p>
          </div>
          <TabButtons v-model="tab" :options="tabs" />
        </div>

        <div
          v-if="summary.loading && !summary.data"
          class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
        >
          <LoadingIndicator class="size-4" />
          {{ __('Loading...') }}
        </div>

        <StateMessage
          v-else-if="summary.error"
          role="alert"
          :icon="
            isPermissionError(summary.error) ? LucideLock : LucideCircleAlert
          "
          :title="
            isPermissionError(summary.error)
              ? __('Not permitted')
              : __('Could not load allocations')
          "
          :description="errorMessage(summary.error)"
        >
          <Button
            v-if="!isPermissionError(summary.error)"
            :label="__('Try again')"
            @click="reload"
          />
        </StateMessage>

        <template v-else-if="summary.data">
          <section :aria-label="__('Payable')" class="mb-6 flex flex-col gap-2">
            <dl
              v-for="total in summary.data.totals"
              :key="total.currency"
              class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-outline-gray-2 bg-[var(--outline-gray-2)] sm:grid-cols-4"
            >
              <div
                v-for="cell in totalCells(total)"
                :key="cell.label"
                class="flex flex-col gap-1 bg-surface-base px-4 py-3"
              >
                <dt class="text-p-sm text-ink-gray-6">{{ cell.label }}</dt>
                <dd
                  class="whitespace-nowrap font-mono text-base font-semibold tabular-nums text-ink-gray-9"
                >
                  {{ money(cell.value, total.currency) }}
                </dd>
              </div>
            </dl>
            <p
              v-if="!summary.data.totals.length"
              class="text-p-sm text-ink-gray-6"
            >
              {{ __('No allocations yet.') }}
            </p>
          </section>

          <div
            v-if="tab === 'allocations'"
            class="overflow-x-auto rounded-lg border border-outline-gray-2"
          >
            <table class="w-full min-w-[56rem] text-base">
              <caption class="sr-only">
                {{
                  __('Allocations')
                }}
              </caption>
              <thead
                class="bg-surface-gray-1 text-left text-p-sm text-ink-gray-6"
              >
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ __('Allocation') }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ __('Receipt') }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ __('Client') }}
                  </th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">
                    {{ __('Gross') }}
                  </th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">
                    {{ __('Net') }}
                  </th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">
                    {{ __('Share') }}
                  </th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">
                    {{ __('Outstanding') }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr v-if="!summary.data.allocations.length">
                  <td
                    colspan="7"
                    class="px-3 py-6 text-center text-p-sm text-ink-gray-6"
                  >
                    {{ __('No allocations yet.') }}
                  </td>
                </tr>
                <tr v-for="row in summary.data.allocations" :key="row.name">
                  <th scope="row" class="px-3 py-2 text-left font-normal">
                    <span class="font-mono text-ink-gray-9">{{
                      row.name
                    }}</span>
                    <span class="mt-1 flex flex-wrap gap-1">
                      <Badge
                        :label="__(row.status)"
                        :theme="allocationTone(row.status)"
                        variant="subtle"
                        size="sm"
                      />
                      <Badge
                        v-if="row.allocation_type === 'Reversal'"
                        :label="__('Reversal')"
                        theme="gray"
                        variant="subtle"
                        size="sm"
                      />
                    </span>
                  </th>
                  <td class="whitespace-nowrap px-3 py-2 text-ink-gray-8">
                    <span class="font-mono">{{ row.payment_entry }}</span>
                    <span class="block text-p-sm text-ink-gray-6">{{
                      date(row.posting_date)
                    }}</span>
                  </td>
                  <td class="px-3 py-2 text-ink-gray-8">{{ row.customer }}</td>
                  <td
                    class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-ink-gray-8"
                  >
                    {{ money(row.gross_amount, row.currency) }}
                  </td>
                  <td
                    class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-ink-gray-8"
                  >
                    {{ money(row.net_amount, row.currency) }}
                  </td>
                  <td
                    class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-ink-gray-9"
                  >
                    {{ money(row.share_amount, row.currency) }}
                  </td>
                  <td
                    class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-ink-gray-9"
                  >
                    {{ money(row.outstanding_amount, row.currency) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <ul
            v-else-if="tab === 'transfers'"
            class="flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-2"
          >
            <li
              v-if="!summary.data.transfers.length"
              class="px-4 py-6 text-center text-p-sm text-ink-gray-6"
            >
              {{ __('No transfers yet.') }}
            </li>
            <li
              v-for="row in summary.data.transfers"
              :key="row.name"
              class="flex flex-col gap-2 px-4 py-3"
            >
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span class="font-mono text-base font-medium text-ink-gray-9">{{
                  row.name
                }}</span>
                <Badge
                  :label="__(row.status)"
                  :theme="transferTone(row.status)"
                  variant="subtle"
                  size="sm"
                />
                <span class="text-p-sm text-ink-gray-6">{{
                  [date(row.transfer_date), row.reference_no]
                    .filter(Boolean)
                    .join(' · ')
                }}</span>
                <span
                  class="ml-auto whitespace-nowrap font-mono text-base tabular-nums text-ink-gray-9"
                  >{{ money(row.amount_sent, row.currency) }}</span
                >
              </div>
              <p class="text-p-sm text-ink-gray-7">
                {{
                  __('Settles {0}', [money(row.allocated_total, row.currency)])
                }}
                <template v-if="row.difference">
                  ·
                  <span class="text-warning">{{
                    __('Difference {0}', [money(row.difference, row.currency)])
                  }}</span>
                </template>
                <template v-if="row.india_payment_entry">
                  ·
                  {{
                    __('Received {0} at {1}', [
                      money(row.amount_received, row.received_currency),
                      row.effective_rate,
                    ])
                  }}
                </template>
              </p>
              <div
                v-if="
                  row.docstatus === 1 &&
                  !row.india_payment_entry &&
                  summary.data.can_transfer
                "
              >
                <Button
                  size="sm"
                  :label="__('Confirm receipt')"
                  @click="openConfirm(row)"
                />
              </div>
            </li>
          </ul>

          <section
            v-else
            :aria-label="__('Before the start date')"
            class="flex flex-col gap-3"
          >
            <p class="text-p-sm text-ink-gray-6">
              {{
                __(
                  'What receipts before the start date would have allocated. For reporting only: nothing is recorded or posted.',
                )
              }}
            </p>
            <form
              class="grid grid-cols-2 gap-3 sm:grid-cols-4"
              @submit.prevent="runPreview"
            >
              <FormControl
                v-model="previewRange.from_date"
                type="date"
                :label="__('From')"
              />
              <FormControl
                v-model="previewRange.to_date"
                type="date"
                :label="__('To')"
              />
              <div class="flex items-end">
                <Button
                  type="submit"
                  :label="__('Preview')"
                  :loading="preview.loading"
                />
              </div>
            </form>
            <p v-if="preview.error" role="alert" class="text-p-sm text-danger">
              {{ errorMessage(preview.error) }}
            </p>
            <div
              v-if="preview.data"
              class="overflow-x-auto rounded-lg border border-outline-gray-2"
            >
              <table class="w-full min-w-[40rem] text-base">
                <caption class="sr-only">
                  {{
                    __('Allocation preview')
                  }}
                </caption>
                <thead
                  class="bg-surface-gray-1 text-left text-p-sm text-ink-gray-6"
                >
                  <tr>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ __('Receipt') }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ __('Client') }}
                    </th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">
                      {{ __('Gross') }}
                    </th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">
                      {{ __('Net') }}
                    </th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">
                      {{ __('Share') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-gray-1">
                  <tr v-if="!preview.data.rows.length">
                    <td
                      colspan="5"
                      class="px-3 py-6 text-center text-p-sm text-ink-gray-6"
                    >
                      {{ __('No receipts in this range.') }}
                    </td>
                  </tr>
                  <tr v-for="row in preview.data.rows" :key="row.payment_entry">
                    <th
                      scope="row"
                      class="whitespace-nowrap px-3 py-2 text-left font-mono font-normal text-ink-gray-9"
                    >
                      {{ row.payment_entry
                      }}<span
                        class="block font-sans text-p-sm text-ink-gray-6"
                        >{{ date(row.posting_date) }}</span
                      >
                    </th>
                    <td class="px-3 py-2 text-ink-gray-8">
                      {{ row.customer }}
                    </td>
                    <td
                      class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums"
                    >
                      {{ money(row.gross) }}
                    </td>
                    <td
                      class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums"
                    >
                      {{ money(row.net) }}
                    </td>
                    <td
                      class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-ink-gray-9"
                    >
                      {{ money(row.share) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
      </template>
    </div>
  </div>

  <TransferDialog v-if="allocationsOn" v-model="showTransfer" @saved="reload" />

  <Dialog v-model:open="confirm.open" :title="__('Confirm receipt')" size="md">
    <template #default>
      <form
        :id="confirmFormId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="submitConfirm"
      >
        <p class="text-p-base text-ink-gray-7">
          {{
            __("Link the partner company's receipt of transfer {0}.", [
              confirm.row?.name,
            ])
          }}
        </p>
        <Link
          v-model="confirm.entry"
          doctype="Payment Entry"
          :filters="{
            docstatus: 1,
            payment_type: 'Receive',
            company: summary.data?.partner_company,
          }"
          :label="__('Receiving Payment Entry')"
          required
        />
      </form>
    </template>
    <template #actions>
      <div class="flex flex-col gap-3">
        <p
          v-if="confirm.error"
          role="alert"
          class="whitespace-pre-line text-p-sm text-danger"
        >
          {{ confirm.error }}
        </p>
        <div class="flex justify-end gap-2">
          <Button :label="__('Cancel')" @click="confirm.open = false" />
          <Button
            variant="solid"
            type="submit"
            :form="confirmFormId"
            :label="__('Confirm')"
            :loading="confirm.saving"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import Link from '@/components/Controls/Link.vue'
import { formatDate } from '@/utils'
import { formatCurrency } from '@/utils/numberFormat.js'
import StateMessage from '@/tbo/quotationApprovals/StateMessage.vue'
import {
  Breadcrumbs,
  Dialog,
  FormControl,
  TabButtons,
  createResource,
  toast,
  usePageMeta,
} from 'frappe-ui'
import { computed, reactive, ref, watch } from 'vue'
import LucideArrowLeftRight from '~icons/lucide/arrow-left-right'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideLock from '~icons/lucide/lock'
import LucideRefreshCw from '~icons/lucide/refresh-cw'
import LucideSend from '~icons/lucide/send'
import TransferDialog from './TransferDialog.vue'
import {
  allocationMethods,
  confirmReceipt,
  errorMessage,
  load,
  useFinanceAccess,
} from './api'
import { isPermissionError, localToday, transferTone } from './finance'

usePageMeta(() => ({ title: __('Allocations & transfers') }))

const { access, loading: accessLoading } = useFinanceAccess()
const allocationsOn = computed(() => Boolean(access.value?.allocations))
const tabs = [
  { label: __('Allocations'), value: 'allocations' },
  { label: __('Transfers'), value: 'transfers' },
  { label: __('Before start date'), value: 'preview' },
]
const tab = ref('allocations')
const showTransfer = ref(false)

const summary = createResource({ url: allocationMethods.summary })
function reload() {
  if (allocationsOn.value) load(summary)
}
watch(allocationsOn, (on) => on && reload(), { immediate: true })

const preview = createResource({ url: allocationMethods.preview })
const previewRange = reactive({ from_date: '', to_date: localToday() })
function runPreview() {
  load(preview, {
    from_date: previewRange.from_date || previewRange.to_date,
    to_date: previewRange.to_date,
  })
}

function money(value, currency) {
  return value === null || value === undefined
    ? '—'
    : formatCurrency(value, '', currency || summary.data?.totals?.[0]?.currency)
}

function date(value) {
  return value ? formatDate(value, '', true) : '—'
}

function totalCells(total) {
  return [
    { label: __('Payable to partner'), value: total.share },
    { label: __('Settled'), value: total.settled },
    { label: __('Pending transfer'), value: total.pending },
    { label: __('Due from partner'), value: total.due_from_partner },
  ]
}

function allocationTone(status) {
  return (
    {
      Open: 'orange',
      'Partly Settled': 'blue',
      Settled: 'green',
      Reversed: 'gray',
    }[status] || 'gray'
  )
}

const confirmFormId = `tbo-confirm-${Math.random().toString(36).slice(2, 8)}`
const confirm = reactive({
  open: false,
  row: null,
  entry: '',
  error: '',
  saving: false,
})
function openConfirm(row) {
  Object.assign(confirm, {
    open: true,
    row,
    entry: '',
    error: '',
    saving: false,
  })
}
async function submitConfirm() {
  if (!confirm.entry) {
    confirm.error = __('Choose the receiving Payment Entry.')
    return
  }
  confirm.saving = true
  confirm.error = ''
  try {
    await confirmReceipt(confirm.row.name, confirm.entry)
    toast.success(__('Transfer {0} confirmed', [confirm.row.name]))
    confirm.open = false
    reload()
  } catch (e) {
    confirm.error = errorMessage(e)
  } finally {
    confirm.saving = false
  }
}
</script>
