<template>
  <LayoutHeader>
    <template #left-header>
      <Breadcrumbs
        :items="[{ label: __('Call today'), route: { name: ROUTE_NAME } }]"
      />
    </template>
    <template v-if="enabled && tab === 'today'" #right-header>
      <Button
        :label="__('Refresh')"
        :iconLeft="LucideRefreshCw"
        :loading="list.loading"
        @click="reload"
      />
    </template>
  </LayoutHeader>

  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
      <div
        v-if="accessLoading"
        class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
      >
        <LoadingIndicator class="size-4" />
        {{ __('Loading...') }}
      </div>

      <StateMessage
        v-else-if="!enabled"
        :icon="LucidePhoneCall"
        :title="__('Smart leads are not switched on')"
        :description="
          __(
            'This page appears once lead scoring is switched on in CRM Settings → TBO smart leads.',
          )
        "
      />

      <template v-else>
        <div
          class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="flex flex-col gap-1">
            <h1 class="text-xl font-semibold text-ink-gray-9">
              {{ __('Call today') }}
            </h1>
            <p class="text-p-sm text-ink-gray-6">
              {{
                __(
                  'Overdue and due follow-ups first, then the leads most worth a call. Scores update every night and when a lead changes.',
                )
              }}
            </p>
          </div>
          <TabButtons v-if="tabs.length > 1" v-model="tab" :options="tabs" />
        </div>

        <template v-if="tab === 'today'">
          <div
            class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <FormControl
              v-if="peopleOptions.length > 1"
              v-model="person"
              class="sm:w-64"
              type="select"
              :label="__('Salesperson')"
              :options="peopleOptions"
            />
            <p
              v-if="summaryText"
              class="flex items-center gap-1.5 text-p-sm text-ink-gray-7"
              aria-live="polite"
            >
              <LucideListChecks
                class="size-4 text-ink-gray-5"
                aria-hidden="true"
              />
              {{ __('Follow-ups') }}: {{ summaryText }}
            </p>
          </div>

          <div
            v-if="list.loading && !list.data"
            class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
          >
            <LoadingIndicator class="size-4" />
            {{ __('Loading...') }}
          </div>

          <StateMessage
            v-else-if="list.error && isPermissionError(list.error)"
            :icon="LucideLock"
            :title="__('Not permitted')"
            :description="
              __('You can open your own list, or your team\'s if you lead one.')
            "
          />

          <StateMessage
            v-else-if="list.error"
            role="alert"
            :icon="LucideCircleAlert"
            :title="__('Could not load the list')"
            :description="errorMessage(list.error)"
          >
            <Button :label="__('Try again')" @click="reload" />
          </StateMessage>

          <StateMessage
            v-else-if="list.data && !list.data.data.length"
            :icon="LucideCircleCheck"
            :title="__('Nothing to call today')"
            :description="
              __(
                'Every open lead has a follow-up on a later day, or was touched today.',
              )
            "
          />

          <ul
            v-else-if="list.data"
            class="flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-2"
            :aria-label="__('Leads to call today')"
          >
            <li
              v-for="row in list.data.data"
              :key="row.id"
              class="flex flex-col gap-2 p-3 sm:p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <router-link
                    :to="{ name: 'Lead', params: { leadId: row.id } }"
                    class="block truncate text-base font-medium text-ink-gray-9 hover:underline focus-visible:underline"
                  >
                    {{ row.lead_name || row.id }}
                  </router-link>
                  <p class="truncate text-p-sm text-ink-gray-6">
                    {{
                      [row.organization, __(row.status), row.source]
                        .filter(Boolean)
                        .join(' · ')
                    }}
                  </p>
                </div>
                <BandChip :band="row.band" :score="row.score" />
              </div>
              <p class="text-p-sm text-ink-gray-7">{{ row.reason }}</p>
              <div
                class="flex flex-wrap items-center gap-x-3 gap-y-1 text-p-sm"
              >
                <span
                  class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
                  :class="whyClasses(row.why)"
                >
                  <component
                    :is="whyIcon(row.why)"
                    class="size-3"
                    aria-hidden="true"
                  />
                  {{ __(WHY_LABELS[row.why]) }}
                  <span v-if="row.follow_up" class="font-mono tabular-nums">
                    {{ datePart(row.follow_up.due) }}
                  </span>
                </span>
                <span class="text-ink-gray-6">
                  <template v-if="row.last_touch">
                    {{ __('Last touch') }}: {{ __(row.last_touch.kind) }},
                    {{ __(daysAgo(row.last_touch.days)) }}
                  </template>
                  <template v-else>{{
                    __('Never touched since it came in')
                  }}</template>
                </span>
              </div>
              <div class="flex flex-wrap gap-2 pt-1">
                <Button
                  v-if="row.tel"
                  size="sm"
                  :iconLeft="LucidePhone"
                  :link="row.tel"
                >
                  <span class="font-mono tabular-nums">{{
                    row.phone_e164
                  }}</span>
                </Button>
                <Button
                  v-if="row.whatsapp"
                  size="sm"
                  :label="__('WhatsApp')"
                  :iconLeft="LucideMessageCircle"
                  @click="openWhatsApp(row)"
                />
                <Button
                  size="sm"
                  :label="__('Log call')"
                  :iconLeft="LucidePencilLine"
                  @click="open('log', row)"
                />
                <Button
                  size="sm"
                  :label="__('Follow-up')"
                  :iconLeft="LucideCalendarPlus"
                  @click="open('follow_up', row)"
                />
                <Dropdown :options="statusOptions(row)">
                  <Button
                    size="sm"
                    :label="__('Status')"
                    :iconRight="LucideChevronDown"
                  />
                </Dropdown>
              </div>
            </li>
          </ul>
          <p v-if="list.data?.more" class="mt-3 text-p-sm text-ink-gray-6">
            {{
              __(
                '{0} more leads are waiting; they move up as these get done.',
                [list.data.more],
              )
            }}
          </p>
        </template>

        <NeedsOwner v-else-if="tab === 'needs_owner'" />
        <LeadTriage v-else-if="tab === 'triage'" />
      </template>
    </div>
  </div>

  <template v-if="current">
    <LogNoteDialog
      v-model="dialogs.log"
      :lead="current.id"
      :lead-name="current.lead_name"
      :status="current.status"
      :ai="Boolean(access?.notes && access?.ai_ready)"
      @saved="reload"
    />
    <SetFollowUpDialog
      v-model="dialogs.follow_up"
      :lead="current.id"
      :lead-name="current.lead_name"
      @saved="reload"
    />
    <WhatsAppDialog
      v-if="access?.notes"
      v-model="dialogs.whatsapp"
      :lead="current.id"
      :lead-name="current.lead_name"
      :phone="current.phone_e164"
    />
  </template>
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import StateMessage from '@/tbo/quotationApprovals/StateMessage.vue'
import { statusesStore } from '@/stores/statuses'
import {
  Breadcrumbs,
  Button,
  Dropdown,
  FormControl,
  TabButtons,
  createResource,
  toast,
  usePageMeta,
} from 'frappe-ui'
import { computed, reactive, ref, watch } from 'vue'
import LucideCalendarPlus from '~icons/lucide/calendar-plus'
import LucideChevronDown from '~icons/lucide/chevron-down'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideCircleCheck from '~icons/lucide/circle-check'
import LucideClock from '~icons/lucide/clock'
import LucideListChecks from '~icons/lucide/list-checks'
import LucideLock from '~icons/lucide/lock'
import LucideMessageCircle from '~icons/lucide/message-circle'
import LucidePencilLine from '~icons/lucide/pencil-line'
import LucidePhone from '~icons/lucide/phone'
import LucidePhoneCall from '~icons/lucide/phone-call'
import LucideRefreshCw from '~icons/lucide/refresh-cw'
import LucideTriangleAlert from '~icons/lucide/triangle-alert'
import LucideCalendarX from '~icons/lucide/calendar-x'
import BandChip from './BandChip.vue'
import LeadTriage from './LeadTriage.vue'
import LogNoteDialog from './LogNoteDialog.vue'
import NeedsOwner from './NeedsOwner.vue'
import SetFollowUpDialog from './SetFollowUpDialog.vue'
import WhatsAppDialog from './WhatsAppDialog.vue'
import {
  errorMessage,
  load,
  methods,
  setStatus,
  useSmartLeadsAccess,
} from './api'
import {
  WHY_LABELS,
  datePart,
  daysAgo,
  isPermissionError,
  summaryLine,
} from './smartLeads'

const ROUTE_NAME = 'Call Today'
usePageMeta(() => ({ title: __('Call today') }))

const { access, enabled, loading: accessLoading } = useSmartLeadsAccess()
const tab = ref('today')
const tabs = computed(() => [
  ...(access.value?.scoring
    ? [{ label: __('Call today'), value: 'today' }]
    : []),
  ...(access.value?.is_sales_head
    ? [{ label: __('Needs owner'), value: 'needs_owner' }]
    : []),
  ...(access.value?.triage ? [{ label: __('Triage'), value: 'triage' }] : []),
])
watch(
  tabs,
  (options) => {
    if (options.length && !options.some((option) => option.value === tab.value))
      tab.value = options[0].value
  },
  { immediate: true },
)

const person = ref('')
const list = createResource({ url: methods.callToday })
const summary = createResource({ url: methods.summary })
const people = createResource({ url: methods.people })
const summaryText = computed(() => summaryLine(summary.data))
const peopleOptions = computed(() =>
  (people.data || []).map((user) => ({
    label: user.full_name || user.user,
    value: user.user,
  })),
)

function reload() {
  if (!access.value?.scoring) return
  const params = { user: person.value || null }
  load(list, params)
  if (access.value?.follow_ups) load(summary, params)
}

watch(
  () => access.value?.scoring,
  (on) => {
    if (!on) return
    load(people)
    reload()
  },
  { immediate: true },
)
watch(person, reload)

const current = ref(null)
const dialogs = reactive({ log: false, follow_up: false, whatsapp: false })

function open(kind, row) {
  current.value = row
  dialogs[kind] = true
}

function openWhatsApp(row) {
  if (access.value?.notes) open('whatsapp', row)
  else window.open(row.whatsapp, '_blank', 'noopener')
}

const { leadStatuses } = statusesStore()
function statusOptions(row) {
  return (leadStatuses.data || [])
    .filter((status) => status.name !== row.status)
    .map((status) => ({
      label: __(status.name),
      onClick: () => changeStatus(row, status.name),
    }))
}

async function changeStatus(row, status) {
  try {
    await setStatus(row.id, status)
    toast.success(__('{0} is now {1}', [row.lead_name || row.id, __(status)]))
    reload()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

const WHY_STYLE = {
  overdue: { classes: 'bg-danger-soft text-danger', icon: LucideTriangleAlert },
  due_today: { classes: 'bg-warning-soft text-warning', icon: LucideClock },
  best_score: {
    classes: 'bg-surface-gray-2 text-ink-gray-7',
    icon: LucideCalendarX,
  },
}
const whyClasses = (why) => (WHY_STYLE[why] || WHY_STYLE.best_score).classes
const whyIcon = (why) => (WHY_STYLE[why] || WHY_STYLE.best_score).icon
</script>
