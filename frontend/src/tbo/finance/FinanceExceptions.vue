<template>
  <LayoutHeader>
    <template #left-header>
      <Breadcrumbs
        :items="[
          {
            label: __('Finance exceptions'),
            route: { name: 'Finance Exceptions' },
          },
        ]"
      />
    </template>
    <template v-if="receivablesOn" #right-header>
      <Button
        :label="__('Refresh')"
        :iconLeft="LucideRefreshCw"
        :loading="list.loading"
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
        v-else-if="!receivablesOn"
        :icon="LucideShieldAlert"
        :title="__('Finance exceptions are not switched on')"
        :description="
          __(
            'This page appears once TBO Smart Settings → Receivables and reminders is on.',
          )
        "
      />

      <template v-else>
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold text-ink-gray-9">
              {{ __('Finance exceptions') }}
            </h1>
            <p class="mt-1 text-p-sm text-ink-gray-6">
              {{
                __(
                  'Extensions, pauses, write-offs and disputes. A TBO Finance Approver decides; nobody decides their own request.',
                )
              }}
            </p>
          </div>
          <TabButtons v-model="tab" :options="tabs" />
        </div>

        <div
          v-if="list.loading && !list.data"
          class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
        >
          <LoadingIndicator class="size-4" />
          {{ __('Loading...') }}
        </div>

        <StateMessage
          v-else-if="list.error"
          role="alert"
          :icon="isPermissionError(list.error) ? LucideLock : LucideCircleAlert"
          :title="
            isPermissionError(list.error)
              ? __('Not permitted')
              : __('Could not load exceptions')
          "
          :description="errorMessage(list.error)"
        >
          <Button
            v-if="!isPermissionError(list.error)"
            :label="__('Try again')"
            @click="reload"
          />
        </StateMessage>

        <StateMessage
          v-else-if="!rows.length"
          :icon="LucideInbox"
          :title="
            tab === 'waiting'
              ? __('Nothing is waiting for a decision')
              : __('No exceptions here')
          "
          :description="
            __(
              'Raise one from an invoice on the Receivables page or a deal\'s Finance tab.',
            )
          "
        />

        <ul
          v-else
          class="flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-2"
        >
          <li
            v-for="row in rows"
            :key="row.name"
            class="flex flex-col gap-2 px-4 py-3"
          >
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span class="font-mono text-base font-medium text-ink-gray-9">{{
                row.name
              }}</span>
              <Badge
                :label="__(row.status)"
                :theme="exceptionTone(row.status)"
                variant="subtle"
                size="sm"
              />
              <span class="text-base text-ink-gray-8">{{
                __(row.exception_type)
              }}</span>
              <span class="text-p-sm text-ink-gray-6"
                >{{ __(row.category) }} · {{ timeAgo(row.creation) }}</span
              >
              <span
                v-if="row.expected_amount"
                class="ml-auto font-mono text-base tabular-nums text-ink-gray-8"
              >
                {{ formatCurrency(row.expected_amount, '', row.currency) }}
              </span>
            </div>
            <p class="text-p-sm text-ink-gray-7">
              <span class="font-mono">{{ row.reference_name }}</span>
              <template v-if="row.customer"> · {{ row.customer }}</template>
              <template v-if="row.new_due_date">
                ·
                {{ __('New due date {0}', [date(row.new_due_date)]) }}</template
              >
              <template v-if="row.pause_until">
                · {{ __('Pause until {0}', [date(row.pause_until)]) }}</template
              >
              <template v-if="row.resolution_reference_name">
                ·
                {{
                  __('Document {0}', [row.resolution_reference_name])
                }}</template
              >
            </p>
            <p class="whitespace-pre-line text-p-base text-ink-gray-8">
              {{ row.reason }}
            </p>
            <p v-if="row.approved_by" class="text-p-sm text-ink-gray-6">
              {{ __('Decided by {0}', [row.approved_by])
              }}<template v-if="row.decision_remarks"
                >: {{ row.decision_remarks }}</template
              >
            </p>
            <div
              v-if="row.can_decide || canReopen(row)"
              class="flex flex-wrap gap-2"
            >
              <Button
                v-if="row.can_decide"
                size="sm"
                variant="solid"
                :label="__('Approve')"
                :iconLeft="LucideCheck"
                @click="openDecision(row, 'approve')"
              />
              <Button
                v-if="row.can_decide"
                size="sm"
                :label="__('Reject')"
                :iconLeft="LucideX"
                @click="openDecision(row, 'reject')"
              />
              <Button
                v-if="canReopen(row)"
                size="sm"
                :label="__('Reopen')"
                @click="openDecision(row, 'reopen')"
              />
            </div>
          </li>
        </ul>
      </template>
    </div>
  </div>

  <Dialog v-model:open="decision.open" :title="decisionTitle" size="md">
    <template #default>
      <form
        :id="formId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="decide"
      >
        <p class="text-p-base text-ink-gray-7">
          <span class="font-mono text-ink-gray-9">{{
            decision.row?.name
          }}</span>
          · {{ __(decision.row?.exception_type) }}
        </p>
        <FormControl
          v-model="decision.remarks"
          type="textarea"
          :rows="3"
          :label="
            decision.action === 'reject'
              ? __('Reason for rejecting')
              : __('Remarks')
          "
          :required="decision.action === 'reject'"
        />
      </form>
    </template>
    <template #actions>
      <div class="flex flex-col gap-3">
        <p
          v-if="decision.error"
          role="alert"
          class="whitespace-pre-line text-p-sm text-danger"
        >
          {{ decision.error }}
        </p>
        <div class="flex justify-end gap-2">
          <Button :label="__('Cancel')" @click="decision.open = false" />
          <Button
            variant="solid"
            type="submit"
            :form="formId"
            :label="decisionTitle"
            :loading="decision.saving"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { formatDate, timeAgo } from '@/utils'
import { formatCurrency } from '@/utils/numberFormat.js'
import { sessionStore } from '@/stores/session'
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
import LucideCheck from '~icons/lucide/check'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideInbox from '~icons/lucide/inbox'
import LucideLock from '~icons/lucide/lock'
import LucideRefreshCw from '~icons/lucide/refresh-cw'
import LucideShieldAlert from '~icons/lucide/shield-alert'
import LucideX from '~icons/lucide/x'
import {
  decideException,
  errorMessage,
  load,
  methods,
  useFinanceAccess,
} from './api'
import { exceptionTone, isPermissionError } from './finance'

usePageMeta(() => ({ title: __('Finance exceptions') }))

const { user } = sessionStore()
const { access, loading: accessLoading } = useFinanceAccess()
const receivablesOn = computed(() => Boolean(access.value?.receivables))
const formId = `tbo-decision-${Math.random().toString(36).slice(2, 8)}`

const tabs = computed(() => [
  ...(access.value?.is_approver
    ? [{ label: __('Waiting for a decision'), value: 'waiting' }]
    : []),
  { label: __('Open'), value: 'open' },
  { label: __('All'), value: 'all' },
])
const tab = ref('open')
watch(
  () => access.value?.is_approver,
  (approver) => {
    if (approver) tab.value = 'waiting'
  },
  { immediate: true },
)

const STATUS_BY_TAB = { waiting: 'Pending Approval', open: null, all: null }
const list = createResource({ url: methods.exceptions })
const rows = computed(() => {
  const all = list.data?.rows || []
  if (tab.value === 'waiting') return all.filter((row) => row.can_decide)
  if (tab.value === 'open')
    return all.filter((row) =>
      ['Open', 'Pending Approval'].includes(row.status),
    )
  return all
})
function reload() {
  if (!receivablesOn.value) return
  load(list, { status: STATUS_BY_TAB[tab.value] })
}
watch([receivablesOn, tab], ([on]) => on && reload(), { immediate: true })

function date(value) {
  return value ? formatDate(value, '', true) : '—'
}

function canReopen(row) {
  return (
    row.status === 'Rejected' &&
    (row.owner === user || access.value?.is_approver)
  )
}

const decision = reactive({
  open: false,
  row: null,
  action: '',
  remarks: '',
  error: '',
  saving: false,
})
const decisionTitle = computed(
  () =>
    ({ approve: __('Approve'), reject: __('Reject'), reopen: __('Reopen') })[
      decision.action
    ] || '',
)

function openDecision(row, action) {
  Object.assign(decision, {
    open: true,
    row,
    action,
    remarks: '',
    error: '',
    saving: false,
  })
}

async function decide() {
  if (decision.action === 'reject' && !decision.remarks.trim()) {
    decision.error = __('Give a reason for the rejection.')
    return
  }
  decision.saving = true
  decision.error = ''
  try {
    await decideException(decision.row.name, decision.action, decision.remarks)
    toast.success(__('{0}: {1}', [decision.row.name, decisionTitle.value]))
    decision.open = false
    reload()
  } catch (e) {
    decision.error = errorMessage(e)
  } finally {
    decision.saving = false
  }
}
</script>
