<template>
  <section
    v-if="show"
    class="flex flex-col gap-4 border-b px-5 py-4"
    :aria-label="__('Lead brief and notes')"
  >
    <div
      v-if="insight.loading && !insight.data"
      class="flex items-center gap-2 text-p-sm text-ink-gray-6"
    >
      <LoadingIndicator class="size-4" />
      {{ __('Loading...') }}
    </div>

    <p v-else-if="insight.error" role="alert" class="text-p-sm text-danger">
      {{ errorMessage(insight.error) }}
    </p>

    <template v-else-if="data">
      <div v-if="data.scoring" class="flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <BandChip :band="data.band" :score="data.score" />
          <span class="text-xs text-ink-gray-5">{{ __('Lead score') }}</span>
        </div>
        <p class="text-p-sm text-ink-gray-7">{{ data.reason }}</p>
      </div>

      <p class="flex items-center gap-1.5 text-p-sm text-ink-gray-7">
        <LucideCalendarClock
          class="size-4 shrink-0 text-ink-gray-5"
          aria-hidden="true"
        />
        <template v-if="data.next_follow_up">
          {{ __('Next follow-up') }}
          <span class="font-mono tabular-nums text-ink-gray-8">
            {{ datePart(data.next_follow_up.due) }}
          </span>
          <span
            v-if="datePart(data.next_follow_up.due) < today"
            class="inline-flex items-center gap-1 rounded bg-danger-soft px-1.5 text-xs font-medium text-danger"
          >
            {{ __('Overdue') }}
          </span>
        </template>
        <template v-else>{{ __('No next follow-up') }}</template>
      </p>

      <div class="flex flex-wrap gap-2">
        <Button
          v-if="data.tel"
          size="sm"
          :label="__('Call')"
          :iconLeft="LucidePhone"
          :link="data.tel"
        />
        <Button
          v-if="data.whatsapp"
          size="sm"
          :label="data.notes ? __('Draft WhatsApp') : __('WhatsApp')"
          :iconLeft="LucideMessageCircle"
          @click="openWhatsApp"
        />
        <Button
          size="sm"
          :label="__('Set follow-up')"
          :iconLeft="LucideCalendarPlus"
          @click="showFollowUp = true"
        />
      </div>

      <div
        v-if="data.notes"
        class="flex flex-col gap-2 rounded-lg border border-outline-gray-2 p-3"
      >
        <div class="flex items-center justify-between gap-2">
          <h3
            class="flex items-center gap-1.5 text-sm font-medium text-ink-gray-8"
          >
            <LucideSparkles class="size-4 text-ink-gray-5" aria-hidden="true" />
            {{ __('Lead brief') }}
          </h3>
          <Button
            size="sm"
            variant="ghost"
            :tooltip="__('Write the brief again')"
            :aria-label="__('Refresh the brief')"
            :loading="briefLoading"
            @click="refresh"
          >
            <template #icon><LucideRefreshCw class="size-3.5" /></template>
          </Button>
        </div>
        <div
          v-if="briefLoading && !brief.lines.length"
          class="flex flex-col gap-1.5"
          aria-busy="true"
        >
          <div
            v-for="i in 3"
            :key="i"
            class="h-3 animate-pulse rounded bg-surface-gray-3"
          />
        </div>
        <ol
          v-else-if="brief.lines.length"
          class="flex flex-col gap-1 text-p-sm text-ink-gray-8"
        >
          <li v-for="line in brief.lines" :key="line">{{ line }}</li>
        </ol>
        <p v-else-if="!briefError" class="text-p-sm text-ink-gray-6">
          {{ __('No brief yet.') }}
        </p>
        <p v-if="briefError" role="alert" class="text-p-sm text-danger">
          {{ briefError }}
        </p>
        <p
          v-if="brief.lines.length && brief.stale && !briefLoading"
          class="text-xs text-ink-gray-5"
        >
          {{ __('The lead changed since this was written.') }}
        </p>
      </div>

      <NoteBox
        :lead="lead"
        :status="status"
        :ai="Boolean(data.notes && access?.ai_ready)"
        @saved="onSaved"
      />
    </template>

    <WhatsAppDialog
      v-if="data?.notes"
      v-model="showWhatsApp"
      :lead="lead"
      :lead-name="leadName"
      :phone="data?.phone_e164 || ''"
    />
    <SetFollowUpDialog
      v-model="showFollowUp"
      :lead="lead"
      :lead-name="leadName"
      @saved="reload"
    />
  </section>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { Button, createResource } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import LucideCalendarClock from '~icons/lucide/calendar-clock'
import LucideCalendarPlus from '~icons/lucide/calendar-plus'
import LucideMessageCircle from '~icons/lucide/message-circle'
import LucidePhone from '~icons/lucide/phone'
import LucideRefreshCw from '~icons/lucide/refresh-cw'
import LucideSparkles from '~icons/lucide/sparkles'
import BandChip from './BandChip.vue'
import NoteBox from './NoteBox.vue'
import SetFollowUpDialog from './SetFollowUpDialog.vue'
import WhatsAppDialog from './WhatsAppDialog.vue'
import {
  errorMessage,
  load,
  methods,
  refreshBrief,
  useSmartLeadsAccess,
} from './api'
import { datePart, localToday } from './smartLeads'

const props = defineProps({
  lead: { type: String, required: true },
  leadName: { type: String, default: '' },
  status: { type: String, default: '' },
})
const emit = defineEmits(['changed'])

const { access, enabled } = useSmartLeadsAccess()
const show = computed(() => enabled.value)
const today = localToday()
const insight = createResource({ url: methods.insight })
const data = computed(() => insight.data)
const brief = ref({ lines: [], stale: true })
const briefLoading = ref(false)
const briefError = ref('')
const showWhatsApp = ref(false)
const showFollowUp = ref(false)

function reload() {
  if (!enabled.value) return
  return load(insight, { lead: props.lead })
}

watch(
  [enabled, () => props.lead, () => props.status],
  ([on]) => on && reload(),
  { immediate: true },
)

// Write the brief when there is none or the lead changed since; cached after.
watch(
  () => insight.data,
  (value) => {
    if (!value?.notes) return
    brief.value = value.brief
    if (value.brief.stale && access.value?.ai_ready) refresh()
  },
)

async function refresh() {
  briefLoading.value = true
  briefError.value = ''
  try {
    brief.value = await refreshBrief(props.lead)
  } catch (e) {
    briefError.value = errorMessage(e)
  } finally {
    briefLoading.value = false
  }
}

function openWhatsApp() {
  if (data.value.notes) showWhatsApp.value = true
  else window.open(data.value.whatsapp, '_blank', 'noopener')
}

function onSaved() {
  reload()
  emit('changed')
}
</script>
