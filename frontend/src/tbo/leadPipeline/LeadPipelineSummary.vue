<template>
  <section
    v-if="enabled && data"
    class="flex flex-col gap-3 border-b px-5 py-4"
    :aria-label="__('Meetings and next step')"
  >
    <div
      v-if="flag.flag"
      class="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-danger"
      role="status"
    >
      <LucideCircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div class="flex flex-col">
        <span class="text-sm font-medium">{{
          __('Needs immediate follow-up')
        }}</span>
        <span v-for="reason in flag.reasons" :key="reason" class="text-p-sm">{{
          reason
        }}</span>
      </div>
    </div>

    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-p-sm">
      <dt class="text-ink-gray-5">{{ __('Last meeting') }}</dt>
      <dd class="font-mono tabular-nums text-ink-gray-8">
        {{
          data.summary.last_meeting_on
            ? data.summary.last_meeting_on.slice(0, 10)
            : '–'
        }}
      </dd>
      <dt class="text-ink-gray-5">{{ __('Next') }}</dt>
      <dd class="min-w-0 text-ink-gray-8">
        <template v-if="next">
          <span class="font-mono tabular-nums">{{
            String(next.at).slice(0, 16)
          }}</span>
          · <span class="break-words">{{ next.label }}</span>
        </template>
        <span v-else class="text-ink-gray-6">{{ __('Nothing planned') }}</span>
      </dd>
      <dt class="text-ink-gray-5">{{ __('Meetings done') }}</dt>
      <dd class="font-mono tabular-nums text-ink-gray-8">
        {{ data.summary.meetings_completed }}
      </dd>
      <template v-if="data.deal">
        <dt class="text-ink-gray-5">{{ __('Deal') }}</dt>
        <dd>
          <router-link
            :to="{ name: 'Deal', params: { dealId: data.deal } }"
            class="font-mono text-ink-gray-8 underline-offset-2 hover:underline"
          >
            {{ data.deal }}
          </router-link>
        </dd>
      </template>
    </dl>
  </section>
</template>

<script setup>
import { createResource } from 'frappe-ui'
import { computed, watch } from 'vue'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import {
  load,
  methods,
  useLeadPipelineAccess,
  useLeadPipelineRefresh,
} from './api'

const props = defineProps({
  lead: { type: String, required: true },
  // the lead's status: a change reloads the summary
  status: { type: String, default: '' },
})

const { enabled } = useLeadPipelineAccess()
const resource = createResource({
  url: methods.lead,
  cache: ['tbo-lead-pipeline', props.lead],
})
const reload = () => enabled.value && load(resource, { lead: props.lead })
watch([enabled, () => props.status], reload, { immediate: true })
useLeadPipelineRefresh(() => props.lead, reload)

const data = computed(() => (resource.error ? null : resource.data))
const flag = computed(
  () => data.value?.summary?.needs_follow_up || { flag: false },
)
const next = computed(() => data.value?.summary?.next_activity)
</script>
