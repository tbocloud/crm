<template>
  <Dialog v-model:open="open" :title="__('Minutes of meeting')" size="4xl">
    <template #default>
      <div
        v-if="resource.loading && !form"
        class="flex items-center justify-center gap-2 py-12 text-base text-ink-gray-6"
      >
        <LoadingIndicator class="size-4" />
        {{ __('Loading...') }}
      </div>
      <p
        v-else-if="resource.error"
        role="alert"
        class="text-p-base text-danger"
      >
        {{ errorMessage(resource.error) }}
      </p>
      <form
        v-else-if="form"
        :id="formId"
        class="flex flex-col gap-6"
        novalidate
        @submit.prevent="save(true)"
      >
        <p class="-mt-3 text-p-sm text-ink-gray-6">
          {{ meeting.stage_label }} · {{ meeting.lead_name }} ·
          <span class="font-mono tabular-nums">{{
            meeting.scheduled_at?.slice(0, 16)
          }}</span>
        </p>

        <section
          v-if="ai"
          class="flex flex-col gap-2 rounded-lg border border-outline-gray-2 p-3"
          :aria-labelledby="`${formId}-ai`"
        >
          <h3
            :id="`${formId}-ai`"
            class="flex items-center gap-1.5 text-sm font-medium text-ink-gray-8"
          >
            <LucideSparkles class="size-4 text-ink-gray-5" aria-hidden="true" />
            {{ __('Draft from your notes') }}
          </h3>
          <FormControl
            v-model="roughNotes"
            type="textarea"
            :rows="3"
            :placeholder="
              __(
                'Rough notes in English or Malayalam: what was discussed, what they need, what happens next',
              )
            "
          />
          <div class="flex flex-wrap items-center gap-2">
            <Button
              :label="__('Draft MOM from my notes')"
              :iconLeft="LucideSparkles"
              :loading="drafting"
              :disabled="!roughNotes.trim()"
              @click="draft"
            />
            <span class="text-p-sm text-ink-gray-5">
              {{
                __(
                  'The AI fills the fields below. Check them before you submit.',
                )
              }}
            </span>
          </div>
          <p
            v-for="warning in draftWarnings"
            :key="warning"
            class="flex items-start gap-1.5 text-p-sm text-warning"
          >
            <LucideTriangleAlert
              class="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            {{ warning }}
          </p>
        </section>

        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormControl
            v-model="form.agenda"
            class="sm:col-span-2"
            type="textarea"
            :rows="2"
            :label="__('Agenda')"
          />
          <div class="sm:col-span-2">
            <FormControl
              v-model="form.discussion_points"
              type="textarea"
              :rows="4"
              :label="__('Key discussion points')"
              required
            />
            <p
              v-if="errors.discussion_points"
              role="alert"
              class="mt-1 text-p-sm text-danger"
            >
              {{ __(errors.discussion_points) }}
            </p>
          </div>
          <FormControl
            v-model="form.client_requirements"
            type="textarea"
            :rows="3"
            :label="__('Client requirements')"
          />
          <FormControl
            v-model="form.decisions"
            type="textarea"
            :rows="3"
            :label="__('Decisions and agreements')"
          />
          <div class="flex flex-col gap-1.5">
            <span class="text-xs text-ink-gray-5">{{
              __('Client interest')
            }}</span>
            <TabButtons
              v-model="form.client_interest"
              :buttons="[
                { label: __('Positive'), value: 'Positive' },
                { label: __('Neutral'), value: 'Neutral' },
                { label: __('Negative'), value: 'Negative' },
              ]"
            />
          </div>
          <FormControl
            v-model="form.objections"
            type="textarea"
            :rows="2"
            :label="__('Objections')"
          />
          <FormControl
            v-model="form.quotation_feedback"
            class="sm:col-span-2"
            :label="__('Quotation feedback')"
            :placeholder="
              __(
                'What the client said about the price or the quotation, if anything',
              )
            "
          />
        </section>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-2 text-base font-medium text-ink-gray-9">
            {{ __('Action items') }}
          </legend>
          <div
            v-for="(row, i) in form.action_items"
            :key="row.key"
            class="relative grid grid-cols-2 gap-2 rounded border border-outline-gray-2 p-2 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_2rem_2rem] sm:items-center sm:border-0 sm:p-0"
          >
            <FormControl
              v-model="row.item"
              class="col-span-2 pr-9 sm:col-span-1 sm:pr-0"
              :placeholder="__('Action')"
              :aria-label="__('Action, row {0}', [i + 1])"
            />
            <FormControl
              v-model="row.responsible"
              :placeholder="__('Responsible')"
              :aria-label="__('Responsible, row {0}', [i + 1])"
            />
            <FormControl
              v-model="row.due_date"
              type="date"
              :aria-label="__('Due, row {0}', [i + 1])"
            />
            <Checkbox
              v-model="row.done"
              class="sm:justify-self-center"
              :label="isMobile ? __('Done') : ''"
              :aria-label="__('Done, row {0}', [i + 1])"
            />
            <div class="absolute right-2 top-2 sm:static">
              <Button
                variant="ghost"
                :icon="LucideTrash2"
                :aria-label="__('Remove row {0}', [i + 1])"
                @click="form.action_items.splice(i, 1)"
              />
            </div>
          </div>
          <div>
            <Button
              :label="__('Add action')"
              :iconLeft="LucidePlus"
              @click="addAction"
            />
          </div>
        </fieldset>

        <section
          class="flex flex-col gap-4 rounded-lg border border-outline-gray-2 p-3"
        >
          <h3 class="text-base font-medium text-ink-gray-9">
            {{ __('Next step') }}
          </h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FormControl
                v-model="form.next_follow_up_on"
                type="date"
                :label="__('Next follow-up')"
              />
              <p
                v-if="errors.next_follow_up_on"
                role="alert"
                class="mt-1 text-p-sm text-danger"
              >
                {{ __(errors.next_follow_up_on) }}
              </p>
            </div>
            <FormControl
              v-model="form.next_meeting_details"
              :label="__('Next meeting details')"
              :placeholder="__('What the next meeting is about')"
            />
          </div>
          <Checkbox
            v-model="bookNext"
            :label="__('Schedule the next meeting now')"
          />
          <div
            v-if="bookNext"
            class="grid grid-cols-2 gap-3 sm:grid-cols-[10rem_1fr_8rem_8rem]"
          >
            <FormControl
              v-model="next.meeting_type"
              type="select"
              :label="__('Type')"
              :options="[
                { label: __('Online'), value: 'Online' },
                { label: __('Physical visit'), value: 'Physical visit' },
              ]"
            />
            <FormControl
              v-if="next.meeting_type === 'Online'"
              v-model="next.meeting_link"
              type="url"
              :label="__('Meeting link')"
            />
            <FormControl
              v-else
              v-model="next.location"
              :label="__('Client location')"
            />
            <FormControl v-model="next.date" type="date" :label="__('Date')" />
            <FormControl v-model="next.time" type="time" :label="__('Time')" />
          </div>
          <p v-if="nextError" role="alert" class="-mt-2 text-p-sm text-danger">
            {{ __(nextError) }}
          </p>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormControl
              v-model="leadStatus"
              type="select"
              :label="__('Lead status')"
              :options="statusOptions"
              :description="
                __(
                  'Left as it is, the lead moves on by itself when you submit.',
                )
              "
            />
            <div v-if="leadStatusLost">
              <FormControl
                v-model="form.lost_reason"
                :label="__('Why was it lost?')"
                required
              />
              <p
                v-if="errors.lost_reason"
                role="alert"
                class="mt-1 text-p-sm text-danger"
              >
                {{ __(errors.lost_reason) }}
              </p>
            </div>
          </div>
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="text-base font-medium text-ink-gray-9">
            {{ __('Attachments') }}
          </h3>
          <ul v-if="attachments.length" class="flex flex-col gap-1">
            <li v-for="file in attachments" :key="file.name">
              <a
                :href="file.file_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-p-sm text-ink-gray-8 underline-offset-2 hover:underline"
              >
                <LucidePaperclip
                  class="size-3.5 text-ink-gray-5"
                  aria-hidden="true"
                />
                {{ file.file_name }}
              </a>
            </li>
          </ul>
          <FileUploader
            :upload-args="{
              doctype: 'TBO Lead Meeting',
              docname: meetingName,
              private: true,
            }"
            @success="(file) => attachments.push(file)"
          >
            <template #default="{ openFileSelector, uploading }">
              <div>
                <Button
                  :label="__('Attach a file')"
                  :iconLeft="LucidePaperclip"
                  :loading="uploading"
                  @click="openFileSelector()"
                />
              </div>
            </template>
          </FileUploader>
        </section>
      </form>
    </template>
    <template #actions>
      <div class="flex flex-col gap-3">
        <p
          v-if="error"
          role="alert"
          class="whitespace-pre-line text-p-sm text-danger"
        >
          {{ error }}
        </p>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button :label="__('Cancel')" @click="open = false" />
          <Button
            :label="__('Save draft')"
            :loading="saving === 'draft'"
            :disabled="!form || Boolean(saving)"
            @click="save(false)"
          />
          <Button
            variant="solid"
            type="submit"
            :form="formId"
            :label="__('Submit MOM')"
            :loading="saving === 'submit'"
            :disabled="!form || Boolean(saving)"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { statusesStore } from '@/stores/statuses'
import { isMobileView } from '@/composables/settings'
import {
  Button,
  Checkbox,
  Dialog,
  FileUploader,
  FormControl,
  TabButtons,
  createResource,
  toast,
} from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import LucidePaperclip from '~icons/lucide/paperclip'
import LucidePlus from '~icons/lucide/plus'
import LucideSparkles from '~icons/lucide/sparkles'
import LucideTrash2 from '~icons/lucide/trash-2'
import LucideTriangleAlert from '~icons/lucide/triangle-alert'
import { draftMom, errorMessage, load, methods, saveMom } from './api'
import {
  MOM_TEXT_FIELDS,
  joinDateTime,
  localNow,
  mergeDraft,
  momPayload,
  schedulePayload,
  validateMom,
  validateSchedule,
} from './pipeline'

const props = defineProps({
  meetingName: { type: String, required: true },
  ai: { type: Boolean, default: false },
})
const emit = defineEmits(['saved'])
const open = defineModel({ type: Boolean })
const formId = `tbo-mom-${Math.random().toString(36).slice(2, 8)}`
const isMobile = isMobileView
const resource = createResource({ url: methods.meeting })
const meeting = computed(() => resource.data || {})
const form = ref(null)
const attachments = ref([])
const errors = ref({})
const error = ref('')
const saving = ref('')
const roughNotes = ref('')
const drafting = ref(false)
const draftWarnings = ref([])
const bookNext = ref(false)
const next = ref({})
const nextError = ref('')
const leadStatus = ref('')
let rowKey = 0

const { leadStatuses } = statusesStore()
const statusOptions = computed(() => [
  { label: __('Move on by itself'), value: '' },
  ...(leadStatuses.data || []).map((status) => ({
    label: __(status.name),
    value: status.name,
  })),
])
const statusType = (name) =>
  (leadStatuses.data || []).find((status) => status.name === name)?.type
const leadStatusLost = computed(() => statusType(leadStatus.value) === 'Lost')

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    form.value = null
    error.value = ''
    errors.value = {}
    roughNotes.value = ''
    draftWarnings.value = []
    bookNext.value = false
    next.value = {
      meeting_type: 'Online',
      date: '',
      time: '',
      meeting_link: '',
      location: '',
      duration_minutes: 60,
    }
    nextError.value = ''
    leadStatus.value = ''
    load(resource, { meeting: props.meetingName })
  },
  { immediate: true },
)

watch(
  () => resource.data,
  (data) => {
    if (!data || form.value) return
    const values = {}
    for (const field of MOM_TEXT_FIELDS) values[field] = data[field] || ''
    values.client_interest = data.client_interest || ''
    values.next_follow_up_on = data.next_follow_up_on || ''
    values.lost_reason = ''
    values.action_items = (data.action_items || []).map((row) => ({
      ...row,
      done: Boolean(row.done),
      key: ++rowKey,
    }))
    form.value = values
    attachments.value = [...(data.attachments || [])]
  },
)

function addAction() {
  form.value.action_items.push({
    key: ++rowKey,
    item: '',
    responsible: '',
    due_date: '',
    done: false,
  })
}

async function draft() {
  drafting.value = true
  error.value = ''
  try {
    const result = await draftMom(props.meetingName, roughNotes.value)
    const merged = mergeDraft(form.value, result)
    merged.action_items = merged.action_items.map((row) => ({
      ...row,
      done: Boolean(row.done),
      key: row.key || ++rowKey,
    }))
    form.value = merged
    draftWarnings.value = result.warnings || []
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    drafting.value = false
  }
}

const today = () => localNow().slice(0, 10)

async function save(submit) {
  const closing = ['Won', 'Lost'].includes(statusType(leadStatus.value))
  errors.value = validateMom(form.value, today(), {
    submit,
    closing,
    lost: submit && leadStatusLost.value,
    nextMeeting: submit && bookNext.value,
  })
  nextError.value = ''
  if (submit && bookNext.value) {
    const nextErrors = validateSchedule(next.value, localNow())
    nextError.value = nextErrors.when || nextErrors.meeting_link || ''
  }
  if (Object.keys(errors.value).length || nextError.value) return
  saving.value = submit ? 'submit' : 'draft'
  error.value = ''
  try {
    const saved = await saveMom({
      meeting: props.meetingName,
      values: momPayload(form.value),
      submit,
      leadStatus: submit ? leadStatus.value : '',
      lostReason: form.value.lost_reason,
      nextMeeting:
        submit &&
        bookNext.value &&
        joinDateTime(next.value.date, next.value.time)
          ? schedulePayload(next.value)
          : null,
    })
    toast.success(submit ? __('MOM submitted') : __('MOM saved as a draft'))
    emit('saved', saved)
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = ''
  }
}
</script>
