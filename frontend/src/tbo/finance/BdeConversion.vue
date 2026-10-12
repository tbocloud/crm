<template>
  <LayoutHeader>
    <template #left-header>
      <Breadcrumbs
        :items="[{ label: __('BDE conversion'), route: { name: ROUTE_NAME } }]"
      />
    </template>
    <template v-if="enabled" #right-header>
      <Button
        :label="__('Refresh')"
        :iconLeft="LucideRefreshCw"
        :loading="report.loading"
        @click="reload"
      />
    </template>
  </LayoutHeader>

  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <div
        v-if="accessLoading"
        class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
      >
        <LoadingIndicator class="size-4" />
        {{ __('Loading...') }}
      </div>

      <StateMessage
        v-else-if="!enabled"
        :icon="LucideChartColumn"
        :title="__('The finance workflow is not switched on')"
        :description="
          __(
            'This report appears once TBO Smart Settings → Finance workflow is on.',
          )
        "
      />

      <template v-else>
        <div class="mb-4 flex flex-col gap-1">
          <h1 class="text-xl font-semibold text-ink-gray-9">
            {{ __('BDE conversion') }}
          </h1>
          <p class="text-p-sm text-ink-gray-6">
            {{
              __(
                'Leads, deals, submitted quotations and won deals per salesperson. Each column counts its own records in the date range.',
              )
            }}
          </p>
        </div>

        <form
          class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
          :aria-label="__('Filters')"
          @submit.prevent="reload"
        >
          <FormControl
            v-model="filters.from_date"
            type="date"
            :label="__('From')"
            @change="reload"
          />
          <FormControl
            v-model="filters.to_date"
            type="date"
            :label="__('To')"
            @change="reload"
          />
          <Link
            v-model="filters.organization"
            doctype="CRM Organization"
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
          <div
            v-if="filters.organization || filters.company"
            class="col-span-2 sm:col-span-4"
          >
            <Button
              variant="ghost"
              size="sm"
              :label="__('Clear client and company')"
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
          :description="
            __('Only CRM users and the finance roles can see this report.')
          "
        />

        <StateMessage
          v-else-if="report.error"
          role="alert"
          :icon="LucideCircleAlert"
          :title="__('Could not load the report')"
          :description="errorMessage(report.error)"
        >
          <Button :label="__('Try again')" @click="reload" />
        </StateMessage>

        <StateMessage
          v-else-if="report.data && !report.data.rows.length"
          :icon="LucideChartColumn"
          :title="__('Nothing in this range')"
          :description="
            __('No leads, deals or quotations match these filters.')
          "
        />

        <div
          v-else-if="report.data"
          class="overflow-x-auto rounded-lg border border-outline-gray-2"
        >
          <table class="w-full min-w-[40rem] text-base">
            <caption class="sr-only">
              {{
                __('BDE conversion from {0} to {1}', [
                  report.data.from_date,
                  report.data.to_date,
                ])
              }}
            </caption>
            <thead
              class="bg-surface-gray-1 text-left text-p-sm text-ink-gray-6"
            >
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  scope="col"
                  class="px-3 py-2 font-medium"
                  :class="column.numeric ? 'text-right' : ''"
                  :aria-sort="
                    sort.key === column.key
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  "
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
                    @click="sortBy(column.key)"
                  >
                    {{ column.label }}
                    <LucideArrowDown
                      v-if="
                        sort.key === column.key && sort.direction === 'desc'
                      "
                      class="size-3.5"
                      aria-hidden="true"
                    />
                    <LucideArrowUp
                      v-else-if="sort.key === column.key"
                      class="size-3.5"
                      aria-hidden="true"
                    />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr v-for="row in rows" :key="row.user">
                <th
                  scope="row"
                  class="px-3 py-2 text-left font-normal text-ink-gray-9"
                >
                  {{ row.full_name }}
                </th>
                <td
                  v-for="column in numericColumns"
                  :key="column.key"
                  class="px-3 py-2 text-right font-mono tabular-nums text-ink-gray-8"
                >
                  {{ cell(row, column) }}
                </td>
              </tr>
            </tbody>
            <tfoot class="border-t border-outline-gray-2 bg-surface-gray-1">
              <tr>
                <th
                  scope="row"
                  class="px-3 py-2 text-left font-medium text-ink-gray-9"
                >
                  {{ __('Total') }}
                </th>
                <td
                  v-for="column in numericColumns"
                  :key="column.key"
                  class="px-3 py-2 text-right font-mono font-medium tabular-nums text-ink-gray-9"
                >
                  {{ cell(report.data.total, column) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import Link from '@/components/Controls/Link.vue'
import { formatCurrency } from '@/utils/numberFormat.js'
import StateMessage from '@/tbo/quotationApprovals/StateMessage.vue'
import {
  Breadcrumbs,
  FormControl,
  createResource,
  usePageMeta,
} from 'frappe-ui'
import { computed, reactive, watch } from 'vue'
import LucideArrowDown from '~icons/lucide/arrow-down'
import LucideArrowUp from '~icons/lucide/arrow-up'
import LucideChartColumn from '~icons/lucide/chart-column'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideLock from '~icons/lucide/lock'
import LucideRefreshCw from '~icons/lucide/refresh-cw'
import { errorMessage, load, methods, useFinanceAccess } from './api'
import { isPermissionError, sortRows } from './finance'

const ROUTE_NAME = 'BDE Conversion'
usePageMeta(() => ({ title: __('BDE conversion') }))

const { enabled, loading: accessLoading } = useFinanceAccess()

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const filters = reactive({
  from_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
  to_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  organization: '',
  company: '',
})
const sort = reactive({ key: 'won_value', direction: 'desc' })

const report = createResource({ url: methods.conversion })
function reload() {
  if (!enabled.value) return
  load(report, {
    from_date: filters.from_date || null,
    to_date: filters.to_date || null,
    organization: filters.organization || null,
    company: filters.company || null,
  })
}
watch(enabled, (on) => on && reload(), { immediate: true })

function clearFilters() {
  filters.organization = ''
  filters.company = ''
  reload()
}

const columns = [
  { key: 'full_name', label: __('Salesperson') },
  { key: 'leads', label: __('Leads'), numeric: true },
  { key: 'deals', label: __('Deals'), numeric: true },
  {
    key: 'conversion_rate',
    label: __('Lead → deal'),
    numeric: true,
    percent: true,
  },
  { key: 'quotations', label: __('Quotations'), numeric: true },
  { key: 'won', label: __('Won'), numeric: true },
  { key: 'won_value', label: __('Won value'), numeric: true, money: true },
]
const numericColumns = columns.filter((column) => column.numeric)
const rows = computed(() =>
  sortRows(report.data?.rows || [], sort.key, sort.direction),
)

function sortBy(key) {
  if (sort.key === key)
    sort.direction = sort.direction === 'asc' ? 'desc' : 'asc'
  else
    Object.assign(sort, {
      key,
      direction: key === 'full_name' ? 'asc' : 'desc',
    })
}

function cell(row, column) {
  const value = row[column.key]
  if (column.money) return formatCurrency(value, '', report.data?.currency)
  if (column.percent) return `${value}%`
  return value
}
</script>
