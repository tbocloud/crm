<template>
  <div class="flex flex-col gap-4 px-3 pb-6 sm:px-10">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-p-sm text-ink-gray-6">
        <template v-if="data">
          {{
            __('{0} meetings · {1} with minutes', [
              data.meetings.length,
              data.summary.meetings_completed,
            ])
          }}
        </template>
      </p>
      <Button
        v-if="data?.can_write && !closed"
        variant="solid"
        :label="__('Schedule meeting')"
        :iconLeft="LucideCalendarPlus"
        @click="openSchedule(null)"
      />
    </div>

    <div
      v-if="resource.loading && !data"
      class="flex items-center gap-2 py-10 text-base text-ink-gray-6"
    >
      <LoadingIndicator class="size-4" />
      {{ __('Loading...') }}
    </div>
    <StateMessage
      v-else-if="resource.error"
      :icon="LucideCircleAlert"
      role="alert"
      :title="__('Meetings could not load')"
      :description="errorMessage(resource.error)"
    >
      <Button :label="__('Try again')" @click="reload" />
    </StateMessage>
    <StateMessage
      v-else-if="data && !data.meetings.length"
      :icon="LucideCalendarDays"
      :title="__('No meetings yet')"
      :description="
        __(
          'Schedule the first meeting. Its minutes, actions and follow-up stay here, meeting by meeting.',
        )
      "
    />

    <ol v-else-if="data" class="relative flex flex-col gap-3">
      <li
        v-for="meeting in data.meetings"
        :key="meeting.name"
        class="rounded-lg border bg-surface-base p-4"
        :class="
          meeting.status === 'MOM Pending'
            ? 'border-danger'
            : 'border-outline-gray-2'
        "
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="flex min-w-0 flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base font-semibold text-ink-gray-9">
                {{ meeting.stage_label }}
              </h3>
              <MeetingStatusChip :status="meeting.status" />
            </div>
            <p
              class="flex flex-wrap items-center gap-x-3 gap-y-1 text-p-sm text-ink-gray-7"
            >
              <span class="inline-flex items-center gap-1">
                <LucideCalendarClock
                  class="size-3.5 text-ink-gray-5"
                  aria-hidden="true"
                />
                <span class="font-mono tabular-nums">{{ when(meeting) }}</span>
              </span>
              <span class="inline-flex items-center gap-1">
                <component
                  :is="
                    meeting.meeting_type === 'Online'
                      ? LucideVideo
                      : LucideMapPin
                  "
                  class="size-3.5 text-ink-gray-5"
                  aria-hidden="true"
                />
                {{
                  meeting.meeting_type === 'Online'
                    ? linkLabel(meeting.meeting_link) || __('Online')
                    : meeting.location || __('Physical visit')
                }}
              </span>
              <span
                v-if="meeting.bde_name"
                class="inline-flex items-center gap-1"
              >
                <LucideUser
                  class="size-3.5 text-ink-gray-5"
                  aria-hidden="true"
                />
                {{ meeting.bde_name }}
              </span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="
                meeting.meeting_type === 'Online' &&
                meeting.meeting_link &&
                !isFinal(meeting.status)
              "
              size="sm"
              :label="__('Join')"
              :iconLeft="LucideExternalLink"
              :link="meeting.meeting_link"
            />
            <Button
              v-if="actionsFor(meeting).mom"
              size="sm"
              :variant="meeting.status === 'MOM Pending' ? 'solid' : 'subtle'"
              :label="__('Write MOM')"
              :iconLeft="LucideNotebookPen"
              @click="openMom(meeting)"
            />
            <Button
              v-else-if="meeting.status === 'MOM Submitted'"
              size="sm"
              variant="ghost"
              :label="__('View MOM')"
              @click="openMom(meeting)"
            />
            <Dropdown
              v-if="actionsFor(meeting).reschedule"
              :options="menu(meeting)"
            >
              <Button
                size="sm"
                variant="ghost"
                :disabled="busy"
                :aria-label="__('More actions for {0}', [meeting.stage_label])"
              >
                <template #icon><LucideEllipsis class="size-4" /></template>
              </Button>
            </Dropdown>
          </div>
        </div>

        <p
          v-if="meeting.status === 'MOM Pending'"
          class="mt-3 flex items-center gap-1.5 text-p-sm text-danger"
        >
          <LucideCircleAlert class="size-3.5 shrink-0" aria-hidden="true" />
          {{ __('The minutes are due: the meeting has ended.') }}
          <template v-if="meeting.escalation_level">
            {{
              meeting.escalation_level === 1
                ? __('The BDM has been told.')
                : __('The sales head has been told.')
            }}
          </template>
        </p>

        <div
          v-if="
            meeting.summary ||
            meeting.next_follow_up_on ||
            meeting.actions_total
          "
          class="mt-3 flex flex-col gap-2 border-t border-outline-gray-1 pt-3"
        >
          <p v-if="meeting.summary" class="text-p-sm text-ink-gray-8">
            {{ meeting.summary }}
          </p>
          <p class="flex flex-wrap gap-x-4 gap-y-1 text-p-sm text-ink-gray-6">
            <span v-if="meeting.client_interest">
              {{ __('Interest') }}:
              <span class="font-medium text-ink-gray-8">{{
                __(meeting.client_interest)
              }}</span>
            </span>
            <span v-if="meeting.actions_total">
              {{ __('Actions') }}:
              <span class="font-mono tabular-nums text-ink-gray-8">
                {{ meeting.actions_total - meeting.actions_open }}/{{
                  meeting.actions_total
                }}
              </span>
              {{ __('done') }}
            </span>
            <span v-if="meeting.next_follow_up_on">
              {{ __('Next follow-up') }}:
              <span class="font-mono tabular-nums text-ink-gray-8">{{
                meeting.next_follow_up_on
              }}</span>
            </span>
            <span v-if="meeting.prepared_by_name">
              {{ __('MOM by {0}', [meeting.prepared_by_name]) }}
            </span>
          </p>
        </div>
      </li>
    </ol>

    <MeetingDialog
      v-model="showSchedule"
      :lead="lead"
      :lead-name="leadName"
      :meeting="rescheduling"
      @saved="onSaved"
    />
    <Dialog
      v-model:open="confirmCancel"
      :title="__('Cancel the {0}?', [cancelling?.stage_label])"
      size="sm"
    >
      <template #default>
        <p class="text-p-base text-ink-gray-7">
          {{
            __(
              'It stays on the lead as Cancelled, and the next meeting you schedule takes its number.',
            )
          }}
        </p>
      </template>
      <template #actions>
        <div class="flex justify-end gap-2">
          <Button :label="__('Keep it')" @click="confirmCancel = false" />
          <Button
            variant="solid"
            theme="red"
            :label="__('Cancel meeting')"
            :loading="busy"
            :disabled="busy"
            @click="cancelMeeting"
          />
        </div>
      </template>
    </Dialog>
    <MomDialog
      v-if="momMeeting"
      v-model="showMom"
      :meeting-name="momMeeting"
      :ai="Boolean(data?.ai)"
      @saved="onSaved"
    />
  </div>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { useDocument } from '@/data/document'
import StateMessage from '@/tbo/quotationApprovals/StateMessage.vue'
import { Button, Dialog, Dropdown, createResource, toast } from 'frappe-ui'
import { computed, ref } from 'vue'
import LucideCalendarClock from '~icons/lucide/calendar-clock'
import LucideCalendarDays from '~icons/lucide/calendar-days'
import LucideCalendarPlus from '~icons/lucide/calendar-plus'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideEllipsis from '~icons/lucide/ellipsis'
import LucideExternalLink from '~icons/lucide/external-link'
import LucideMapPin from '~icons/lucide/map-pin'
import LucideNotebookPen from '~icons/lucide/notebook-pen'
import LucideUser from '~icons/lucide/user'
import LucideVideo from '~icons/lucide/video'
import MeetingDialog from './MeetingDialog.vue'
import MeetingStatusChip from './MeetingStatusChip.vue'
import MomDialog from './MomDialog.vue'
import {
  errorMessage,
  load,
  methods,
  setMeetingStatus,
  useLeadPipelineRefresh,
} from './api'
import { isFinal, linkLabel, localNow, meetingActions } from './pipeline'

const props = defineProps({
  lead: { type: String, required: true },
  leadName: { type: String, default: '' },
})

const resource = createResource({
  url: methods.lead,
  cache: ['tbo-lead-pipeline', props.lead],
})
const reload = () => load(resource, { lead: props.lead })
reload()
useLeadPipelineRefresh(() => props.lead, reload)
const data = computed(() => resource.data)
const closed = computed(() => data.value?.status_type === 'Lost')

const showSchedule = ref(false)
const rescheduling = ref(null)
const showMom = ref(false)
const momMeeting = ref('')
const confirmCancel = ref(false)
const cancelling = ref(null)

const actionsFor = (meeting) =>
  meetingActions(meeting, data.value?.can_write, localNow())

function when(meeting) {
  return `${meeting.scheduled_at?.slice(0, 16)}–${String(meeting.ends_at || '').slice(11, 16)}`
}

function openSchedule(meeting) {
  rescheduling.value = meeting
  showSchedule.value = true
}

function openMom(meeting) {
  momMeeting.value = meeting.name
  showMom.value = true
}

// a meeting or its MOM can move the lead's status; the lead page reads it from
// the shared document
const { document: leadDocument } = useDocument('CRM Lead', props.lead)
function onSaved() {
  reload()
  leadDocument.reload()
}

// one status change at a time, until its reload has finished
const busy = ref(false)
async function setStatus(meeting, status) {
  if (busy.value) return
  busy.value = true
  try {
    await setMeetingStatus(meeting.name, status)
    toast.success(__('{0}: {1}', [meeting.stage_label, __(status)]))
    await reload()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function cancelMeeting() {
  await setStatus(cancelling.value, 'Cancelled')
  confirmCancel.value = false
}

function menu(meeting) {
  const actions = actionsFor(meeting)
  return [
    { label: __('Reschedule'), onClick: () => openSchedule(meeting) },
    actions.followUp && {
      label: __('Needs a follow-up'),
      onClick: () => setStatus(meeting, 'Follow-up Required'),
    },
    actions.cancel && {
      label: __('Cancel meeting'),
      onClick: () => {
        cancelling.value = meeting
        confirmCancel.value = true
      },
    },
  ].filter(Boolean)
}
</script>
