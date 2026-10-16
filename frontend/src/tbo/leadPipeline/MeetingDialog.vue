<template>
  <Dialog
    v-model:open="open"
    :title="
      meeting
        ? __('Reschedule {0}', [meeting.stage_label])
        : __('Schedule a meeting')
    "
    size="lg"
  >
    <template #default>
      <form
        :id="formId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="save"
      >
        <p class="-mt-3 text-p-sm text-ink-gray-6">{{ leadName }}</p>

        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-ink-gray-5">{{ __('Type') }}</span>
          <TabButtons
            v-model="form.meeting_type"
            :buttons="[
              { label: __('Online'), value: 'Online' },
              { label: __('Physical visit'), value: 'Physical visit' },
            ]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_8rem_8rem]">
          <FormControl
            v-model="form.date"
            type="date"
            :label="__('Date')"
            required
          />
          <FormControl
            v-model="form.time"
            type="time"
            :label="__('Time')"
            required
          />
          <FormControl
            v-model="form.duration_minutes"
            class="col-span-2 sm:col-span-1"
            type="select"
            :label="__('Duration')"
            :options="durations"
          />
        </div>
        <p v-if="errors.when" role="alert" class="-mt-2 text-p-sm text-danger">
          {{ __(errors.when) }}
        </p>

        <div v-if="form.meeting_type === 'Online'">
          <FormControl
            v-model="form.meeting_link"
            type="url"
            :label="__('Meeting link')"
            :placeholder="__('Paste the Google Meet or Teams link')"
          />
          <p
            v-if="errors.meeting_link"
            role="alert"
            class="mt-1 text-p-sm text-danger"
          >
            {{ __(errors.meeting_link) }}
          </p>
        </div>
        <FormControl
          v-else
          v-model="form.location"
          type="textarea"
          :rows="2"
          :label="__('Client location')"
          :placeholder="__('Address or landmark')"
        />

        <FormControl
          v-model="form.participants"
          :label="__('Participants')"
          :placeholder="__('Who joins, from the client and from TBO')"
        />
        <FormControl
          v-if="!meeting"
          v-model="form.agenda"
          type="textarea"
          :rows="2"
          :label="__('Agenda')"
          :placeholder="__('Optional: what the meeting is for')"
        />
        <p
          v-if="error"
          role="alert"
          class="whitespace-pre-line text-p-sm text-danger"
        >
          {{ error }}
        </p>
      </form>
    </template>
    <template #actions>
      <div class="flex justify-end gap-2">
        <Button :label="__('Cancel')" @click="open = false" />
        <Button
          variant="solid"
          type="submit"
          :form="formId"
          :label="meeting ? __('Reschedule') : __('Schedule')"
          :loading="saving"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { Button, Dialog, FormControl, TabButtons, toast } from 'frappe-ui'
import { ref, watch } from 'vue'
import { errorMessage, scheduleMeeting, updateMeeting } from './api'
import {
  localNow,
  schedulePayload,
  splitDateTime,
  validateSchedule,
} from './pipeline'

const props = defineProps({
  lead: { type: String, required: true },
  leadName: { type: String, default: '' },
  // a meeting card to reschedule; empty to schedule a new one
  meeting: { type: Object, default: null },
})
const emit = defineEmits(['saved'])
const open = defineModel({ type: Boolean })
const formId = `tbo-meeting-${Math.random().toString(36).slice(2, 8)}`
const durations = [30, 45, 60, 90, 120, 180].map((minutes) => ({
  label: minutes < 60 ? __('{0} min', [minutes]) : __('{0} h', [minutes / 60]),
  value: minutes,
}))
const form = ref({})
const errors = ref({})
const error = ref('')
const saving = ref(false)

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    const m = props.meeting
    form.value = {
      meeting_type: m?.meeting_type || 'Online',
      ...splitDateTime(m?.scheduled_at),
      duration_minutes: m?.duration_minutes || 60,
      meeting_link: m?.meeting_link || '',
      location: m?.location || '',
      participants: m?.participants || '',
      agenda: '',
    }
    errors.value = {}
    error.value = ''
  },
  { immediate: true },
)

async function save() {
  errors.value = validateSchedule(form.value, localNow(), {
    reschedule: Boolean(props.meeting),
  })
  if (Object.keys(errors.value).length) return
  saving.value = true
  error.value = ''
  try {
    const values = schedulePayload(form.value)
    // rescheduling never touches the agenda, which belongs to the MOM by then
    if (props.meeting) delete values.agenda
    const saved = props.meeting
      ? await updateMeeting(props.meeting.name, values)
      : await scheduleMeeting(props.lead, values)
    toast.success(
      props.meeting
        ? __('{0} rescheduled', [saved.stage_label])
        : __('{0} scheduled', [saved.stage_label]),
    )
    emit('saved', saved)
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
