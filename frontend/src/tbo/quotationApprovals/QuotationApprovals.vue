<template>
  <LayoutHeader>
    <template #left-header>
      <Breadcrumbs
        :items="[{ label: __('Approvals'), route: { name: ROUTE_NAME } }]"
      />
    </template>
    <template v-if="enabled" #right-header>
      <Button
        :label="__('Refresh')"
        :iconLeft="LucideRefreshCw"
        :loading="activeList?.loading"
        @click="reloadActive"
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
        :icon="LucideBadgeCheck"
        :title="__('Quotation approvals are not switched on')"
        :description="
          __(
            'Discount and commission limits are off for this site, so nothing needs approval.',
          )
        "
      />

      <StateMessage
        v-else-if="!tabs.length"
        :icon="LucideLock"
        :title="__('No approval level')"
        :description="
          __(
            'You have no quotation approval level. Ask HR to give you your designation\'s role.',
          )
        "
      />

      <template v-else>
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold text-ink-gray-9">
              {{ __('Quotation approvals') }}
            </h1>
            <p class="mt-1 text-p-sm text-ink-gray-6">
              {{ __('Your level: {0}', [access.level?.level || '—']) }}
              <template v-for="kind in access.kinds" :key="kind">
                ·
                {{ __('{0} limit', [__(kind)]) }}
                <span class="font-mono tabular-nums text-ink-gray-8">
                  {{ access.limit_labels[kind] }}
                </span>
              </template>
            </p>
          </div>
          <TabButtons v-model="tab" :options="tabs" />
        </div>

        <div
          v-if="activeList.loading && !activeList.data"
          class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
        >
          <LoadingIndicator class="size-4" />
          {{ __('Loading...') }}
        </div>

        <StateMessage
          v-else-if="activeList.error && isPermissionError(activeList.error)"
          :icon="LucideLock"
          :title="__('Not permitted')"
          :description="errorMessage(activeList.error)"
        />

        <StateMessage
          v-else-if="activeList.error"
          role="alert"
          :icon="LucideCircleAlert"
          :title="__('Could not load approvals')"
          :description="errorMessage(activeList.error)"
        >
          <Button :label="__('Try again')" @click="reloadActive" />
        </StateMessage>

        <StateMessage
          v-else-if="!rows.length"
          :icon="LucideInbox"
          :title="emptyCopy.title"
          :description="emptyCopy.description"
        />

        <div
          v-else
          class="overflow-hidden rounded-lg border border-outline-gray-2 bg-surface-base"
        >
          <div
            class="hidden gap-4 border-b border-outline-gray-2 bg-surface-gray-1 px-4 py-2 text-xs font-medium text-ink-gray-6 lg:grid"
            :class="GRID"
            aria-hidden="true"
          >
            <span>{{ __('Customer · deal · quotation') }}</span>
            <span class="text-right">{{ __('Current → requested') }}</span>
            <span class="text-right">{{ __('Value') }}</span>
            <span>{{ __('Requested by') }}</span>
            <span>{{ __('Stage') }}</span>
            <span class="sr-only">{{ __('Actions') }}</span>
          </div>
          <ul class="divide-y divide-outline-gray-1">
            <li
              v-for="row in rows"
              :key="row.name"
              class="flex flex-col gap-3 px-4 py-3 lg:grid lg:items-center lg:gap-4"
              :class="GRID"
            >
              <div class="min-w-0">
                <p class="truncate text-base font-medium text-ink-gray-9">
                  {{ row.customer || __('No customer') }}
                </p>
                <RouterLink
                  v-if="row.deal"
                  :to="{ name: 'Deal', params: { dealId: row.deal } }"
                  class="truncate font-mono text-xs text-ink-gray-6 underline-offset-2 hover:text-ink-gray-8 hover:underline"
                >
                  {{ row.deal }}
                </RouterLink>
                <span v-else class="text-xs text-ink-gray-5">
                  {{ __('No deal') }}
                </span>
                <p class="mt-1 flex min-w-0 items-baseline gap-2">
                  <span class="truncate font-mono text-sm text-ink-gray-8">
                    {{ row.quotation }}
                  </span>
                  <span class="shrink-0 text-xs text-ink-gray-6">
                    {{ __(row.kind) }}
                  </span>
                </p>
              </div>

              <div
                class="flex items-baseline justify-between gap-4 lg:contents"
              >
                <span
                  class="font-mono text-base tabular-nums text-ink-gray-9 lg:text-right"
                >
                  <span class="text-ink-gray-6">
                    {{ formatPercent(row.previous_percent) }}
                  </span>
                  <span aria-hidden="true" class="text-ink-gray-5"> → </span>
                  <span class="sr-only">{{ __('to') }}</span>
                  {{ formatPercent(row.requested_percent) }}
                </span>
                <span
                  class="font-mono text-sm tabular-nums text-ink-gray-8 lg:text-right"
                >
                  {{ formatValue(row) }}
                </span>
              </div>

              <div class="min-w-0 text-sm">
                <p class="truncate text-ink-gray-8">
                  {{ row.requested_by_name }}
                </p>
                <time
                  :datetime="row.creation"
                  :title="formatDate(row.creation)"
                  class="text-xs tabular-nums text-ink-gray-6"
                >
                  {{ timeAgo(row.creation) }}
                </time>
              </div>

              <div>
                <AdjustmentChip
                  :label="requestStage(row).label"
                  :tone="requestStage(row).tone"
                  :voided="row.voided"
                  wrap
                />
              </div>

              <div
                class="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end"
              >
                <template v-for="item in actionsFor(row)" :key="item.action">
                  <Button
                    size="sm"
                    variant="subtle"
                    :label="item.label"
                    :iconLeft="item.icon"
                    @click="openDecision(row, item)"
                  />
                </template>
                <Button
                  size="sm"
                  variant="ghost"
                  :icon="LucideHistory"
                  :aria-label="__('Approval trail')"
                  :tooltip="__('Approval trail')"
                  @click="openTrail(row.name)"
                />
              </div>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>

  <DecisionDialog
    v-model="decision.open"
    :request="decision.row"
    :action="decision.action"
    :approve="decision.approve"
    @decided="afterDecision"
  />
  <TrailPanel v-model="trail.open" :name="trail.name" />
</template>

<script setup>
import LucideBadgeCheck from '~icons/lucide/badge-check'
import LucideCheck from '~icons/lucide/check'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideX from '~icons/lucide/x'
import LucideArrowUpRight from '~icons/lucide/arrow-up-right'
import LucideShieldCheck from '~icons/lucide/shield-check'
import LucideHistory from '~icons/lucide/history'
import LucideInbox from '~icons/lucide/inbox'
import LucideLock from '~icons/lucide/lock'
import LucideRefreshCw from '~icons/lucide/refresh-cw'
import LayoutHeader from '@/components/LayoutHeader.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import AdjustmentChip from './AdjustmentChip.vue'
import DecisionDialog from './DecisionDialog.vue'
import StateMessage from './StateMessage.vue'
import TrailPanel from './TrailPanel.vue'
import {
  errorMessage,
  load,
  methods,
  useAdjustmentRefresh,
  useApprovalAccess,
} from './api'
import { formatPercent, requestActions, requestStage } from './status'
import { formatDate, timeAgo } from '@/utils'
import { formatCurrency } from '@/utils/numberFormat.js'
import { Breadcrumbs, Button, TabButtons, createResource } from 'frappe-ui'
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const ROUTE_NAME = 'Quotation Approvals'
const GRID =
  'lg:grid-cols-[minmax(0,1.6fr)_6.5rem_8.5rem_minmax(0,1fr)_minmax(0,1fr)_21.5rem]'

const route = useRoute()
const router = useRouter()
const {
  resource: accessResource,
  access,
  loading: accessLoading,
  enabled,
} = useApprovalAccess()

const lists = {
  waiting: createResource({ url: methods.pending }),
  mine: createResource({
    url: methods.requests,
    makeParams: () => ({ scope: 'mine' }),
  }),
  all: createResource({
    url: methods.requests,
    makeParams: () => ({ scope: 'all' }),
  }),
}

const tabs = computed(() => {
  const a = access.value
  if (!a?.enabled) return []
  const result = []
  if (a.is_approver) {
    const count = lists.waiting.data?.length
    result.push({
      label: count ? __('Waiting for me ({0})', [count]) : __('Waiting for me'),
      value: 'waiting',
    })
  }
  if (a.level || a.open_requests) {
    result.push({ label: __('I requested'), value: 'mine' })
  }
  if (a.can_view_all) result.push({ label: __('All'), value: 'all' })
  return result
})

const tab = computed({
  get() {
    const values = tabs.value.map((t) => t.value)
    return values.includes(route.query.tab) ? route.query.tab : values[0]
  },
  set(value) {
    router.replace({ query: { ...route.query, tab: value } })
  },
})

const activeList = computed(() => lists[tab.value])
const rows = computed(() => activeList.value?.data || [])

watch(
  tab,
  (value) => {
    if (value && !lists[value].data && !lists[value].loading) {
      load(lists[value])
    }
    // the waiting count shows on its tab, so keep it loaded for approvers
    if (
      access.value?.is_approver &&
      value !== 'waiting' &&
      !lists.waiting.data
    ) {
      load(lists.waiting)
    }
  },
  { immediate: true },
)

function reloadActive() {
  load(accessResource)
  if (!tab.value) return
  load(lists[tab.value])
  if (tab.value !== 'waiting' && access.value?.is_approver) {
    load(lists.waiting)
  }
}
useAdjustmentRefresh(reloadActive)

const emptyCopy = computed(() => {
  if (tab.value === 'waiting') {
    return {
      title: __('Nothing waiting for you'),
      description: __('Requests that need your decision show up here.'),
    }
  }
  if (tab.value === 'mine') {
    return {
      title: __('No requests yet'),
      description: __(
        "Ask for approval from a deal's Quotations tab when a discount or commission is above your limit.",
      ),
    }
  }
  return { title: __('No requests yet'), description: '' }
})

const ACTIONS = {
  approve: { label: __('Approve'), icon: LucideCheck },
  reject: { label: __('Reject'), icon: LucideX },
  forward: { label: __('Forward'), icon: LucideArrowUpRight },
  override: { label: __('Override'), icon: LucideShieldCheck },
}

function actionsFor(row) {
  const allowed = requestActions(row, access.value, tab.value === 'waiting')
  return Object.keys(ACTIONS)
    .filter((action) => allowed[action])
    .map((action) => ({
      action,
      approve: allowed.approve,
      ...ACTIONS[action],
    }))
}

const decision = reactive({
  open: false,
  row: null,
  action: 'approve',
  approve: null,
})
function openDecision(row, item) {
  Object.assign(decision, {
    row,
    action: item.action,
    approve: item.approve,
    open: true,
  })
}

function afterDecision() {
  reloadActive()
}

const trail = reactive({ open: false, name: '' })
function openTrail(name) {
  trail.name = name
  trail.open = true
}

function isPermissionError(error) {
  return error?.exc_type === 'PermissionError'
}

function formatValue(row) {
  const currency = row.currency || window.sysdefaults?.currency
  return formatCurrency(row.quotation_value, '', currency)
}
</script>
