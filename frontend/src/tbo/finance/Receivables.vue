<template>
  <LayoutHeader>
    <template #left-header>
      <Breadcrumbs
        :items="[{ label: __('Receivables'), route: { name: 'Receivables' } }]"
      />
    </template>
    <template v-if="receivablesOn" #right-header>
      <Button
        :label="__('Export')"
        :iconLeft="LucideDownload"
        :disabled="!rows.length"
        @click="exportCsv"
      />
      <Button
        :label="__('Refresh')"
        :iconLeft="LucideRefreshCw"
        :loading="report.loading"
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
        v-else-if="!receivablesOn"
        :icon="LucideWallet"
        :title="__('Receivables are not switched on')"
        :description="
          __(
            'This page appears once TBO Smart Settings → Receivables and reminders is on.',
          )
        "
      />

      <template v-else>
        <div class="mb-4 flex flex-col gap-1">
          <h1 class="text-xl font-semibold text-ink-gray-9">
            {{ __('Receivables') }}
          </h1>
          <p class="text-p-sm text-ink-gray-6">
            {{
              __(
                "Open invoices, aged by each payment term's due date. Reminders run daily; follow-ups and exceptions are logged.",
              )
            }}
          </p>
        </div>

        <form
          class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"
          :aria-label="__('Filters')"
          @submit.prevent="reload"
        >
          <Link
            v-model="filters.customer"
            doctype="Customer"
            :label="__('Client')"
            :placeholder="__('All clients')"
            @update:modelValue="reload"
          />
          <Link
            v-model="filters.company"
            doctype="Company"
            :label="__('Company')"
            :placeholder="__('All companies')"
            @update:modelValue="reload"
          />
          <Link
            v-model="filters.deal_owner"
            doctype="User"
            :label="__('BDE')"
            :placeholder="__('Everyone')"
            @update:modelValue="reload"
          />
          <Link
            v-model="filters.accounts_owner"
            doctype="User"
            :label="__('Accounts owner')"
            :placeholder="__('Everyone')"
            @update:modelValue="reload"
          />
          <div v-if="hasFilters" class="col-span-2 lg:col-span-4">
            <Button
              variant="ghost"
              size="sm"
              :label="__('Clear filters')"
              @click="clearFilters"
            />
          </div>
        </form>

        <div
          v-if="report.loading && !report.data"
          class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
        >
          <LoadingIndicator class="size-4" />
          {{ __('Loading...') }}
        </div>

        <StateMessage
          v-else-if="report.error && isPermissionError(report.error)"
          :icon="LucideLock"
          :title="__('Not permitted')"
          :description="errorMessage(report.error)"
        />

        <StateMessage
          v-else-if="report.error"
          role="alert"
          :icon="LucideCircleAlert"
          :title="__('Could not load receivables')"
          :description="errorMessage(report.error)"
        >
          <Button :label="__('Try again')" @click="reload" />
        </StateMessage>

        <StateMessage
          v-else-if="report.data && !rows.length"
          :icon="LucideCircleCheck"
          :title="__('No open receivables')"
          :description="__('Every invoice in these filters is paid.')"
        />

        <template v-else-if="report.data">
          <section :aria-label="__('Ageing')" class="mb-6 flex flex-col gap-2">
            <dl
              v-for="total in report.data.totals"
              :key="total.currency"
              class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-outline-gray-2 bg-outline-gray-2 sm:grid-cols-3 lg:grid-cols-7"
            >
              <div class="flex flex-col gap-1 bg-surface-base px-4 py-3">
                <dt class="text-p-sm text-ink-gray-6">
                  {{ __('Outstanding') }}
                </dt>
                <dd
                  class="whitespace-nowrap font-mono text-base font-semibold tabular-nums text-ink-gray-9"
                >
                  {{ money(total.outstanding, total.currency) }}
                </dd>
              </div>
              <div class="flex flex-col gap-1 bg-surface-base px-4 py-3">
                <dt class="text-p-sm text-ink-gray-6">{{ __('Overdue') }}</dt>
                <dd
                  class="flex items-center gap-1 whitespace-nowrap font-mono text-base font-semibold tabular-nums"
                  :class="total.overdue > 0 ? 'text-danger' : 'text-ink-gray-9'"
                >
                  <LucideCircleAlert
                    v-if="total.overdue > 0"
                    class="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {{ money(total.overdue, total.currency) }}
                </dd>
              </div>
              <div
                v-for="bucket in AGEING_BUCKETS"
                :key="bucket.key"
                class="flex flex-col gap-1 bg-surface-base px-4 py-3"
              >
                <dt class="text-p-sm text-ink-gray-6">
                  {{ __(bucket.label) }}
                </dt>
                <dd
                  class="whitespace-nowrap font-mono text-base tabular-nums text-ink-gray-8"
                >
                  {{ money(total.buckets[bucket.key], total.currency) }}
                </dd>
              </div>
            </dl>
          </section>

          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-base font-semibold text-ink-gray-9">
              {{ view === 'invoices' ? __('Invoices') : __('Clients') }}
              <span
                class="ml-1 font-mono text-sm font-normal tabular-nums text-ink-gray-5"
                >{{
                  view === 'invoices'
                    ? rows.length
                    : report.data.customers.length
                }}</span
              >
            </h2>
            <TabButtons
              v-model="view"
              :options="[
                { label: __('Invoices'), value: 'invoices' },
                { label: __('Clients'), value: 'clients' },
              ]"
            />
          </div>

          <div class="overflow-x-auto rounded-lg border border-outline-gray-2">
            <table
              v-if="view === 'invoices'"
              class="w-full min-w-[68rem] text-base"
            >
              <caption class="sr-only">
                {{
                  __('Open invoices')
                }}
              </caption>
              <thead
                class="bg-surface-gray-1 text-left text-p-sm text-ink-gray-6"
              >
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ __('Invoice') }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ __('Client') }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ __('Due') }}
                  </th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">
                    {{ __('Outstanding') }}
                  </th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">
                    {{ __('Overdue') }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ __('Owners') }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ __('Follow-up') }}
                  </th>
                  <th scope="col" class="px-3 py-2">
                    <span class="sr-only">{{ __('Actions') }}</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr v-for="row in rows" :key="row.invoice" class="align-top">
                  <th scope="row" class="px-3 py-2 text-left font-normal">
                    <span class="font-mono text-ink-gray-9">{{
                      row.invoice
                    }}</span>
                    <span
                      v-if="row.exceptions.length"
                      class="mt-1 flex flex-wrap gap-1"
                    >
                      <Badge
                        v-for="ex in row.exceptions"
                        :key="ex.name"
                        :label="`${__(ex.exception_type)} · ${__(ex.status)}`"
                        :theme="exceptionTone(ex.status)"
                        variant="subtle"
                        size="sm"
                      />
                    </span>
                  </th>
                  <td class="px-3 py-2 text-ink-gray-8">
                    {{ row.customer_name
                    }}<span class="block text-p-sm text-ink-gray-6">{{
                      row.company
                    }}</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-ink-gray-8">
                    {{ date(row.due_date) }}
                    <span
                      v-if="row.days_overdue > 0"
                      class="mt-0.5 flex items-center gap-1 text-p-sm text-danger"
                    >
                      <LucideCircleAlert
                        class="size-3.5 shrink-0"
                        aria-hidden="true"
                      />{{ __('{0} days overdue', [row.days_overdue]) }}
                    </span>
                  </td>
                  <td
                    class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-ink-gray-9"
                  >
                    {{ money(row.outstanding, row.currency) }}
                  </td>
                  <td
                    class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums"
                    :class="row.overdue > 0 ? 'text-danger' : 'text-ink-gray-6'"
                  >
                    {{ money(row.overdue, row.currency) }}
                  </td>
                  <td class="px-3 py-2 text-p-sm text-ink-gray-7">
                    <span class="block"
                      >{{ __('BDE') }}:
                      {{ row.deal_owner_name || row.deal_owner || '—' }}</span
                    >
                    <span class="block"
                      >{{ __('Accounts') }}:
                      {{
                        row.accounts_owner_name || row.accounts_owner || '—'
                      }}</span
                    >
                  </td>
                  <td class="px-3 py-2 text-p-sm text-ink-gray-7">
                    <span class="block"
                      >{{ __('Level {0}', [row.escalation_level])
                      }}<template v-if="row.last_reminder">
                        · {{ row.last_reminder }}
                        {{ date(row.last_reminder_on) }}</template
                      ></span
                    >
                    <span v-if="row.promised_date" class="block"
                      >{{ __('Promised {0}', [date(row.promised_date)])
                      }}<template v-if="row.promised_amount">
                        ·
                        {{ money(row.promised_amount, row.currency) }}</template
                      ></span
                    >
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex justify-end gap-1">
                      <Button
                        size="sm"
                        :label="__('Follow-up')"
                        @click="openFollowUp(row)"
                      />
                      <Button
                        size="sm"
                        :label="__('Exception')"
                        @click="openException(row)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <table v-else class="w-full min-w-[48rem] text-base">
              <caption class="sr-only">
                {{
                  __('Receivables per client')
                }}
              </caption>
              <thead
                class="bg-surface-gray-1 text-left text-p-sm text-ink-gray-6"
              >
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ __('Client') }}
                  </th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">
                    {{ __('Invoices') }}
                  </th>
                  <th
                    v-for="bucket in AGEING_BUCKETS"
                    :key="bucket.key"
                    scope="col"
                    class="px-3 py-2 text-right font-medium"
                  >
                    {{ __(bucket.label) }}
                  </th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">
                    {{ __('Outstanding') }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr
                  v-for="row in report.data.customers"
                  :key="`${row.customer}-${row.currency}`"
                >
                  <th
                    scope="row"
                    class="px-3 py-2 text-left font-normal text-ink-gray-9"
                  >
                    {{ row.customer_name }}
                  </th>
                  <td
                    class="px-3 py-2 text-right font-mono tabular-nums text-ink-gray-8"
                  >
                    {{ row.invoices }}
                  </td>
                  <td
                    v-for="bucket in AGEING_BUCKETS"
                    :key="bucket.key"
                    class="px-3 py-2 text-right font-mono tabular-nums text-ink-gray-8"
                  >
                    {{ money(row.buckets[bucket.key], row.currency) }}
                  </td>
                  <td
                    class="px-3 py-2 text-right font-mono font-medium tabular-nums text-ink-gray-9"
                  >
                    {{ money(row.outstanding, row.currency) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p
            v-if="report.data.truncated"
            class="mt-2 text-p-sm text-ink-gray-6"
          >
            {{
              __(
                'Showing the first 2,000 invoices; narrow the filters to see the rest.',
              )
            }}
          </p>
        </template>
      </template>
    </div>
  </div>

  <FollowUpDialog
    v-if="selected"
    v-model="showFollowUp"
    :invoice="selected.invoice"
    @saved="reload"
  />
  <ExceptionDialog
    v-if="selected"
    v-model="showException"
    :invoice="selected.invoice"
    :terms="selected.terms"
    @saved="reload"
  />
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import Link from '@/components/Controls/Link.vue'
import { formatDate } from '@/utils'
import { formatCurrency } from '@/utils/numberFormat.js'
import StateMessage from '@/tbo/quotationApprovals/StateMessage.vue'
import { Breadcrumbs, TabButtons, createResource, usePageMeta } from 'frappe-ui'
import { computed, reactive, ref, watch } from 'vue'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideCircleCheck from '~icons/lucide/circle-check'
import LucideDownload from '~icons/lucide/download'
import LucideLock from '~icons/lucide/lock'
import LucideRefreshCw from '~icons/lucide/refresh-cw'
import LucideWallet from '~icons/lucide/wallet'
import ExceptionDialog from './ExceptionDialog.vue'
import FollowUpDialog from './FollowUpDialog.vue'
import { errorMessage, load, methods, useFinanceAccess } from './api'
import {
  AGEING_BUCKETS,
  exceptionTone,
  isPermissionError,
  localToday,
  receivablesCsv,
} from './finance'

usePageMeta(() => ({ title: __('Receivables') }))

const { access, loading: accessLoading } = useFinanceAccess()
const receivablesOn = computed(() => Boolean(access.value?.receivables))
const filters = reactive({
  customer: '',
  company: '',
  deal_owner: '',
  accounts_owner: '',
})
const hasFilters = computed(() => Object.values(filters).some(Boolean))
const view = ref('invoices')
const selected = ref(null)
const showFollowUp = ref(false)
const showException = ref(false)

const report = createResource({ url: methods.receivables })
const rows = computed(() => report.data?.rows || [])
function reload() {
  if (!receivablesOn.value) return
  load(
    report,
    Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value || null]),
    ),
  )
}
watch(receivablesOn, (on) => on && reload(), { immediate: true })

function clearFilters() {
  Object.assign(filters, {
    customer: '',
    company: '',
    deal_owner: '',
    accounts_owner: '',
  })
  reload()
}

function money(value, currency) {
  return value === null || value === undefined
    ? '—'
    : formatCurrency(value, '', currency)
}

function date(value) {
  return value ? formatDate(value, '', true) : '—'
}

function openFollowUp(row) {
  selected.value = row
  showFollowUp.value = true
}

function openException(row) {
  selected.value = row
  showException.value = true
}

function exportCsv() {
  const blob = new Blob([receivablesCsv(rows.value)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `receivables-${localToday()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>
