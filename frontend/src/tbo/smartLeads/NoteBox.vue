<template>
  <form class="flex flex-col gap-3" novalidate @submit.prevent="onSubmit">
    <template v-if="!draft">
      <div class="flex items-end justify-between gap-2">
        <label :for="inputId" class="text-sm font-medium text-ink-gray-8">
          {{ __('Log call / note') }}
        </label>
        <div v-if="speech.supported" class="flex items-center gap-1">
          <select
            v-model="speech.lang"
            class="h-7 rounded border-outline-gray-2 bg-surface-gray-2 py-0 pl-2 pr-6 text-xs text-ink-gray-8"
            :aria-label="__('Dictation language')"
          >
            <option value="en-IN">{{ __('English') }}</option>
            <option value="ml-IN">{{ __('Malayalam') }}</option>
          </select>
          <Button
            size="sm"
            variant="subtle"
            :aria-pressed="speech.listening"
            :tooltip="speech.listening ? __('Stop dictation') : __('Dictate')"
            :aria-label="
              speech.listening ? __('Stop dictation') : __('Dictate')
            "
            @click="toggleSpeech"
          >
            <template #icon>
              <LucideMicOff v-if="speech.listening" class="size-4" />
              <LucideMic v-else class="size-4" />
            </template>
          </Button>
        </div>
      </div>
      <textarea
        :id="inputId"
        v-model="text"
        rows="3"
        class="w-full resize-y rounded border-outline-gray-2 bg-surface-gray-2 px-2 py-1.5 text-p-base text-ink-gray-8 placeholder-ink-gray-4 focus:border-outline-gray-4 focus:bg-surface-base"
        :placeholder="
          __('What happened? Rough words are fine, English or Malayalam.')
        "
        :maxlength="4000"
      />
      <div v-if="!ai" class="flex flex-wrap items-center gap-2">
        <TabButtons
          v-model="kind"
          :options="[
            { label: __('Call'), value: 'call' },
            { label: __('Note'), value: 'note' },
          ]"
        />
      </div>
      <p
        v-if="error"
        role="alert"
        class="whitespace-pre-line text-p-sm text-danger"
      >
        {{ error }}
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <Button
          v-if="ai"
          :label="__('Save as written')"
          :disabled="!text.trim() || busy"
          @click="saveAsWritten"
        />
        <Button
          variant="solid"
          type="submit"
          :label="ai ? __('Draft with AI') : __('Save')"
          :iconLeft="ai ? LucideSparkles : undefined"
          :loading="busy"
          :disabled="!text.trim()"
        />
      </div>
    </template>

    <template v-else>
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-medium text-ink-gray-8">
          {{ __('Check and save') }}
        </p>
        <Button
          size="sm"
          variant="ghost"
          :label="__('Back')"
          @click="draft = null"
        />
      </div>
      <p
        v-for="warning in draft.warnings"
        :key="warning"
        class="flex items-start gap-1.5 rounded bg-warning-soft px-2 py-1.5 text-p-sm text-ink-gray-8"
      >
        <LucideTriangleAlert
          class="mt-0.5 size-3.5 shrink-0 text-warning"
          aria-hidden="true"
        />
        {{ warning }}
      </p>
      <FormControl
        v-model="draft.note"
        type="textarea"
        :rows="4"
        :label="__('Note')"
      />
      <TabButtons
        v-model="draft.kind"
        :options="[
          { label: __('Call'), value: 'call' },
          { label: __('Note'), value: 'note' },
        ]"
      />
      <FormControl
        v-model="draft.next_status"
        type="select"
        :label="__('Status')"
        :options="statusOptions"
      />
      <div class="flex flex-col gap-3">
        <div>
          <FormControl
            v-model="draft.follow_up_on"
            type="date"
            :label="__('Next follow-up')"
          />
          <p v-if="dateError" role="alert" class="mt-1 text-p-sm text-danger">
            {{ __(dateError) }}
          </p>
        </div>
        <FormControl
          v-model="draft.follow_up_reason"
          :label="__('What to do then')"
          :placeholder="__('Optional')"
        />
      </div>
      <p
        v-if="error"
        role="alert"
        class="whitespace-pre-line text-p-sm text-danger"
      >
        {{ error }}
      </p>
      <div class="flex justify-end">
        <Button
          variant="solid"
          type="submit"
          :label="__('Save')"
          :loading="busy"
          :disabled="!draft.note?.trim()"
        />
      </div>
    </template>
  </form>
</template>

<script setup>
import { Button, FormControl, TabButtons, toast } from 'frappe-ui'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import LucideMic from '~icons/lucide/mic'
import LucideMicOff from '~icons/lucide/mic-off'
import LucideSparkles from '~icons/lucide/sparkles'
import LucideTriangleAlert from '~icons/lucide/triangle-alert'
import { statusesStore } from '@/stores/statuses'
import { draftNote, errorMessage, saveNote } from './api'
import { followUpError, localToday, notePayload } from './smartLeads'

const props = defineProps({
  lead: { type: String, required: true },
  status: { type: String, default: '' },
  // AI notes on and a provider set up: draft first, else save as written
  ai: { type: Boolean, default: false },
  initialKind: { type: String, default: 'note' },
})
const emit = defineEmits(['saved'])

const inputId = `tbo-note-${Math.random().toString(36).slice(2, 8)}`
const text = ref('')
const kind = ref(props.initialKind)
const draft = ref(null)
const busy = ref(false)
const error = ref('')

const { leadStatuses } = statusesStore()
const statusOptions = computed(() =>
  (leadStatuses.data || []).map((status) => ({
    label: __(status.name),
    value: status.name,
  })),
)
const dateError = computed(() =>
  draft.value?.follow_up_on
    ? followUpError(draft.value.follow_up_on, localToday())
    : '',
)

async function onSubmit() {
  if (draft.value) return confirm()
  if (!props.ai) return saveAsWritten()
  busy.value = true
  error.value = ''
  try {
    draft.value = reactive({
      follow_up_reason: '',
      warnings: [],
      ...(await draftNote(props.lead, text.value)),
    })
  } catch (e) {
    error.value = `${errorMessage(e)}\n${__('You can still save it as written.')}`
  } finally {
    busy.value = false
  }
}

function saveAsWritten() {
  return write({
    lead: props.lead,
    text: text.value.trim(),
    kind: props.ai ? props.initialKind : kind.value,
  })
}

function confirm() {
  if (dateError.value) return
  const payload = notePayload(props.lead, draft.value)
  if (payload.status === props.status) payload.status = null
  return write(payload)
}

async function write(payload) {
  busy.value = true
  error.value = ''
  try {
    const result = await saveNote(payload)
    toast.success(result.call ? __('Call logged') : __('Note saved'))
    text.value = ''
    draft.value = null
    emit('saved', result)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

// Dictation where the browser has it (Chrome, Android); typing works everywhere.
const Recognition =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition)
const speech = reactive({
  supported: Boolean(Recognition),
  listening: false,
  lang: 'en-IN',
})
let recognizer = null

function toggleSpeech() {
  if (speech.listening) return recognizer?.stop()
  recognizer = new Recognition()
  recognizer.lang = speech.lang
  recognizer.interimResults = false
  recognizer.onresult = (event) => {
    const heard = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(' ')
    text.value = [text.value.trim(), heard].filter(Boolean).join(' ')
  }
  recognizer.onend = () => (speech.listening = false)
  recognizer.onerror = () => (speech.listening = false)
  speech.listening = true
  recognizer.start()
}

onBeforeUnmount(() => recognizer?.stop())
</script>
