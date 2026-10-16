<template>
  <LayoutHeader>
    <template #left-header>
      <Breadcrumbs
        :items="[{ label: __('Pipeline'), route: { name: 'Pipeline' } }]"
      />
    </template>
    <template v-if="enabled" #right-header>
      <Button
        :label="__('Refresh')"
        :iconLeft="LucideRefreshCw"
        :loading="board.loading"
        @click="reload"
      />
    </template>
  </LayoutHeader>

  <div class="flex-1 overflow-y-auto">
    <div
      class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6"
    >
      <StateMessage
        v-if="accessReady && !enabled"
        :icon="LucideChartNoAxesColumn"
        :title="__('The pipeline dashboard is not switched on')"
        :description="
          __(
            'It appears once Settings → TBO → Lead pipeline → Pipeline dashboard is on.',
          )
        "
      />

      <template v-else-if="enabled">
        <div class="flex flex-col gap-1">
          <h1 class="text-xl font-semibold text-ink-gray-9">
            {{ __('Pipeline') }}
          </h1>
          <p class="text-p-sm text-ink-gray-6">
            {{ scopeText }}
          </p>
        </div>

        <form
          class="grid grid-cols-2 gap-3 sm:grid-cols-5"
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
          <FormControl
            v-model="filters.bde"
            type="select"
            :label="__('BDE')"
            :options="bdeOptions"
            :disabled="bdeOptions.length < 3"
            @change="reload"
          />
          <Link
            v-model="filters.source"
            doctype="CRM Lead Source"
            :label="__('Source')"
            :placeholder="__('All sources')"
            @update:modelValue="reload"
          />
          <FormControl
            v-model="filters.status"
            class="col-span-2 sm:col-span-1"
            type="select"
            :label="__('Status')"
            :options="statusOptions"
            @change="reload"
          />
        </form>

        <div
          v-if="board.loading && !data"
          class="flex items-center gap-2 py-12 text-base text-ink-gray-6"
        >
          <LoadingIndicator class="size-4" />
          {{ __('Loading...') }}
        </div>
        <StateMessage
          v-else-if="board.error"
          :icon="LucideCircleAlert"
          role="alert"
          :title="__('The pipeline could not load')"
          :description="errorMessage(board.error)"
        >
          <Button :label="__('Try again')" @click="reload" />
        </StateMessage>

        <template v-else-if="data">
          <!-- the headline numbers -->
          <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div
              v-for="tile in tiles"
              :key="tile.label"
              class="flex flex-col gap-1 rounded-lg border border-outline-gray-2 bg-surface-base p-3"
            >
              <dt class="flex items-center gap-1.5 text-p-sm text-ink-gray-6">
                <component
                  :is="tile.icon"
                  v-if="tile.icon"
                  class="size-3.5"
                  :class="tile.iconClass"
                  aria-hidden="true"
                />
                {{ tile.label }}
              </dt>
              <dd
                class="font-mono text-2xl font-semibold tabular-nums text-ink-gray-9"
              >
                {{ tile.value }}
              </dd>
            </div>
          </dl>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section class="flex flex-col gap-3" aria-labelledby="pd-status">
              <h2
                id="pd-status"
                class="text-base font-semibold text-ink-gray-9"
              >
                {{ __('Leads by status') }}
                <span class="ml-1 text-sm font-normal text-ink-gray-5">{{
                  __('created in the range')
                }}</span>
              </h2>
              <ul class="flex flex-col gap-1.5">
                <li
                  v-for="row in statusRows"
                  :key="row.status"
                  class="grid grid-cols-[8rem_minmax(0,1fr)_3rem] items-center gap-2 text-p-sm sm:grid-cols-[13rem_minmax(0,1fr)_3rem]"
                  :title="`${__(row.status)}: ${row.count}`"
                >
                  <span class="truncate text-ink-gray-7">{{
                    __(row.status)
                  }}</span>
                  <span
                    class="h-2.5 rounded bg-surface-gray-2"
                    aria-hidden="true"
                  >
                    <span
                      class="block h-full rounded bg-surface-gray-5"
                      :style="{ width: `${barWidth(row.count)}%` }"
                    />
                  </span>
                  <span
                    class="text-right font-mono tabular-nums text-ink-gray-9"
                    >{{ row.count }}</span
                  >
                </li>
              </ul>
            </section>

            <section class="flex flex-col gap-3" aria-labelledby="pd-meetings">
              <h2
                id="pd-meetings"
                class="text-base font-semibold text-ink-gray-9"
              >
                {{ __('Meetings completed') }}
              </h2>
              <dl class="grid grid-cols-4 gap-2">
                <div
                  v-for="part in meetingParts"
                  :key="part.key"
                  class="rounded border border-outline-gray-2 p-2"
                >
                  <dt class="text-xs text-ink-gray-6">{{ part.label }}</dt>
                  <dd
                    class="font-mono text-lg font-semibold tabular-nums text-ink-gray-9"
                  >
                    {{ data.meetings_completed[part.key] }}
                  </dd>
                </div>
              </dl>
              <h3 class="mt-2 text-sm font-medium text-ink-gray-8">
                {{ __('Won and lost') }}
              </h3>
              <p class="text-p-sm text-ink-gray-7">
                <span class="inline-flex items-center gap-1 text-success">
                  <LucideCircleCheck class="size-3.5" aria-hidden="true" />
                  {{ __('{0} won', [data.won]) }}
                </span>
                ·
                <span class="inline-flex items-center gap-1 text-danger">
                  <LucideCircleX class="size-3.5" aria-hidden="true" />
                  {{ __('{0} lost', [data.lost]) }}
                </span>
              </p>
              <ul
                v-if="data.lost_reasons.length"
                class="flex flex-col gap-1 text-p-sm"
              >
                <li
                  v-for="row in data.lost_reasons"
                  :key="row.reason"
                  class="flex justify-between gap-2"
                >
                  <span class="text-ink-gray-7">{{ row.reason }}</span>
                  <span class="font-mono tabular-nums text-ink-gray-9">{{
                    row.count
                  }}</span>
                </li>
              </ul>
            </section>
          </div>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <FinanceSection
              :title="__('Upcoming meetings')"
              :count="data.upcoming_meetings.count"
              :empty="__('Nothing booked.')"
            >
              <li
                v-for="row in data.upcoming_meetings.rows"
                :key="row.name"
                class="py-2"
              >
                <router-link
                  :to="leadRoute(row.lead, 'meetings')"
                  class="block hover:underline"
                >
                  <span class="text-ink-gray-9">{{
                    row.lead_name || row.lead
                  }}</span>
                  <span class="block text-p-sm text-ink-gray-6">
                    {{ row.stage_label }} ·
                    <span class="font-mono tabular-nums">{{
                      String(row.scheduled_at).slice(0, 16)
                    }}</span>
                  </span>
                </router-link>
              </li>
            </FinanceSection>
            <FinanceSection
              :title="__('MOM pending')"
              :count="data.mom_pending.count"
              :empty="__('All minutes are in.')"
            >
              <li
                v-for="row in data.mom_pending.rows"
                :key="row.name"
                class="py-2"
              >
                <router-link
                  :to="leadRoute(row.lead, 'meetings')"
                  class="block hover:underline"
                >
                  <span class="text-ink-gray-9">{{
                    row.lead_name || row.lead
                  }}</span>
                  <span class="block text-p-sm text-ink-gray-6">
                    {{ row.stage_label }} · {{ nameOf(row.bde) }}
                  </span>
                </router-link>
              </li>
            </FinanceSection>
            <FinanceSection
              :title="__('High potential')"
              :count="data.high_potential.count"
              :empty="__('No hot or positive leads.')"
            >
              <li
                v-for="row in data.high_potential.rows"
                :key="row.name"
                class="flex items-center justify-between gap-2 py-2"
              >
                <router-link
                  :to="leadRoute(row.name)"
                  class="min-w-0 hover:underline"
                >
                  <span class="block truncate text-ink-gray-9">{{
                    row.organization || row.lead_name
                  }}</span>
                  <span class="block text-p-sm text-ink-gray-6">{{
                    __(row.status)
                  }}</span>
                </router-link>
                <span class="font-mono tabular-nums text-ink-gray-8">{{
                  row.lead_score || '–'
                }}</span>
              </li>
            </FinanceSection>
          </div>

          <section class="flex flex-col gap-3" aria-labelledby="pd-bde">
            <h2 id="pd-bde" class="text-base font-semibold text-ink-gray-9">
              {{ __('By BDE') }}
            </h2>
            <div
              class="overflow-x-auto rounded-lg border border-outline-gray-2"
            >
              <table class="w-full min-w-[40rem] text-p-sm">
                <thead class="text-left text-xs text-ink-gray-6">
                  <tr class="border-b border-outline-gray-2">
                    <th class="px-3 py-2 font-normal">{{ __('BDE') }}</th>
                    <th class="px-3 py-2 text-right font-normal">
                      {{ __('Meetings held') }}
                    </th>
                    <th class="px-3 py-2 text-right font-normal">
                      {{ __('MOM rate') }}
                    </th>
                    <th class="px-3 py-2 text-right font-normal">
                      {{ __('MOM pending') }}
                    </th>
                    <th class="px-3 py-2 text-right font-normal">
                      {{ __('Quotations') }}
                    </th>
                    <th class="px-3 py-2 text-right font-normal">
                      {{ __('Sent') }}
                    </th>
                    <th class="px-3 py-2 text-right font-normal">
                      {{ __('Won') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!data.by_bde.length">
                    <td colspan="7" class="px-3 py-4 text-ink-gray-6">
                      {{ __('No activity in the range.') }}
                    </td>
                  </tr>
                  <tr
                    v-for="row in data.by_bde"
                    :key="row.user"
                    class="border-b border-outline-gray-1 last:border-0"
                  >
                    <td class="px-3 py-2 text-ink-gray-9">
                      {{ row.full_name }}
                    </td>
                    <td class="px-3 py-2 text-right font-mono tabular-nums">
                      {{ row.meetings_held }}
                    </td>
                    <td class="px-3 py-2 text-right font-mono tabular-nums">
                      {{ row.mom_rate }}%
                    </td>
                    <td
                      class="px-3 py-2 text-right font-mono tabular-nums"
                      :class="row.mom_pending ? 'text-danger' : ''"
                    >
                      {{ row.mom_pending }}
                    </td>
                    <td class="px-3 py-2 text-right font-mono tabular-nums">
                      {{ row.quotations }}
                    </td>
                    <td class="px-3 py-2 text-right font-mono tabular-nums">
                      {{ row.quotations_sent }}
                    </td>
                    <td class="px-3 py-2 text-right font-mono tabular-nums">
                      {{ row.won }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="flex flex-col gap-3" aria-labelledby="pd-quotes">
            <h2 id="pd-quotes" class="text-base font-semibold text-ink-gray-9">
              {{ __('Quotations') }}
            </h2>
            <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div
                v-for="tile in quoteTiles"
                :key="tile.label"
                class="rounded-lg border border-outline-gray-2 p-3"
              >
                <dt class="text-p-sm text-ink-gray-6">{{ tile.label }}</dt>
                <dd
                  class="font-mono text-lg font-semibold tabular-nums text-ink-gray-9"
                >
                  {{ tile.value }}
                </dd>
              </div>
            </dl>
            <ul
              v-if="data.quotations.by_status.length"
              class="flex flex-wrap gap-2"
            >
              <li v-for="row in data.quotations.by_status" :key="row.status">
                <StatusChip
                  :label="`${__(row.status)} · ${row.count}`"
                  v-bind="quoteTone(row.status)"
                />
              </li>
            </ul>
          </section>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import Link from '@/components/Controls/Link.vue'
import { formatCurrency } from '@/utils/numberFormat.js'
import { localToday } from '@/tbo/finance/finance'
import StateMessage from '@/tbo/quotationApprovals/StateMessage.vue'
import {
  Breadcrumbs,
  Button,
  FormControl,
  createResource,
  usePageMeta,
} from 'frappe-ui'
import { computed, reactive, watch } from 'vue'
import LucideCalendarClock from '~icons/lucide/calendar-clock'
import LucideChartNoAxesColumn from '~icons/lucide/chart-no-axes-column'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideCircleCheck from '~icons/lucide/circle-check'
import LucideCircleX from '~icons/lucide/circle-x'
import LucideRefreshCw from '~icons/lucide/refresh-cw'
import FinanceSection from '@/tbo/finance/FinanceSection.vue'
import StatusChip from './StatusChip.vue'
import {
  dashboardMethods,
  errorMessage,
  load,
  usePipelineDashboardAccess,
} from './api'
import { PIPELINE_STATUSES, monthStart } from './pipeline'
import { quoteTone } from './quotes'

usePageMeta(() => ({ title: __('Pipeline') }))
const { enabled, resource: access } = usePipelineDashboardAccess()
const accessReady = computed(() => Boolean(access.data || access.error))

const filters = reactive({
  from_date: monthStart(),
  to_date: localToday(),
  bde: '',
  source: '',
  status: '',
})
const board = createResource({ url: dashboardMethods.dashboard })
function reload() {
  if (!enabled.value) return
  load(board, {
    from_date: filters.from_date || null,
    to_date: filters.to_date || null,
    bde: filters.bde || null,
    source: filters.source || null,
    status: filters.status || null,
  })
}
watch(enabled, (on) => on && reload(), { immediate: true })

const data = computed(() => board.data)
const people = computed(() =>
  Object.fromEntries(
    (data.value?.people || []).map((p) => [p.user, p.full_name]),
  ),
)
const nameOf = (user) => people.value[user] || user
const bdeOptions = computed(() => [
  { label: __('Everyone I can see'), value: '' },
  ...(data.value?.people || []).map((p) => ({
    label: p.full_name,
    value: p.user,
  })),
])
const statusOptions = [
  { label: __('All statuses'), value: '' },
  ...PIPELINE_STATUSES.map((status) => ({ label: __(status), value: status })),
]
const scopeText = computed(
  () =>
    ({
      own: __('Your leads, meetings and quotations.'),
      team: __("Your team's leads, meetings and quotations."),
      all: __('Every lead, meeting and quotation.'),
    })[data.value?.scope] || '',
)
const money = (value) =>
  formatCurrency(value, '', data.value?.quotations?.currency)

const tiles = computed(() => {
  const d = data.value
  return [
    { label: __('Leads created'), value: d.leads_created },
    { label: __('Meetings held'), value: d.meetings_completed.total },
    {
      label: __('Upcoming meetings'),
      value: d.upcoming_meetings.count,
      icon: LucideCalendarClock,
      iconClass: 'text-info',
    },
    {
      label: __('Overdue follow-ups'),
      value: d.overdue_follow_ups,
      icon: d.overdue_follow_ups ? LucideCircleAlert : null,
      iconClass: 'text-danger',
    },
    { label: __('Win rate'), value: `${d.win_rate}%` },
    { label: __('Lead → won'), value: `${d.conversion_rate}%` },
  ]
})
const quoteTiles = computed(() => {
  const q = data.value.quotations
  return [
    { label: __('Made'), value: q.count },
    { label: __('Total value'), value: money(q.value) },
    { label: __('Pending approval'), value: q.pending_approval },
    { label: __('With the client'), value: q.awaiting_client },
    {
      label: __('Accepted / rejected'),
      value: `${q.accepted} / ${q.rejected}`,
    },
    { label: __('Active value'), value: money(q.active.value) },
  ]
})
const statusRows = computed(() =>
  (data.value?.leads_by_status || []).filter(
    (row) => row.count || PIPELINE_STATUSES.includes(row.status),
  ),
)
const maxCount = computed(() =>
  Math.max(1, ...statusRows.value.map((row) => row.count)),
)
const barWidth = (count) => (count / maxCount.value) * 100
const meetingParts = [
  { key: 'first', label: __('1st') },
  { key: 'second', label: __('2nd') },
  { key: 'third', label: __('3rd') },
  { key: 'additional', label: __('Additional') },
]
const leadRoute = (lead, tab) => ({
  name: 'Lead',
  params: { leadId: lead },
  hash: tab ? `#${tab}` : '',
})
</script>
