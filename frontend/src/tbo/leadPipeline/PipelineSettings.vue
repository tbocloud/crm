<template>
  <div class="flex h-full flex-col gap-6 px-6 py-8 text-ink-gray-8">
    <div class="flex items-start justify-between gap-4 px-2">
      <div class="flex flex-col gap-1">
        <h2 class="text-2xl-semibold leading-none">
          {{ __('Lead pipeline') }}
        </h2>
        <p class="text-p-base text-ink-gray-6">
          {{
            __(
              'Meetings and minutes on the lead, automatic lead statuses, and the deal made at Closed – Won. Off until you turn it on.',
            )
          }}
        </p>
      </div>
      <Button
        variant="solid"
        :label="__('Save')"
        :loading="saving"
        :disabled="!dirty"
        @click="save"
      />
    </div>

    <div
      v-if="resource.loading && !form"
      class="flex items-center gap-2 px-2 text-ink-gray-6"
    >
      <LoadingIndicator class="size-4" />
      {{ __('Loading...') }}
    </div>
    <p
      v-else-if="resource.error"
      role="alert"
      class="px-2 text-p-base text-danger"
    >
      {{ errorMessage(resource.error) }}
    </p>
    <div
      v-else-if="form"
      class="flex flex-1 flex-col gap-8 overflow-y-auto px-2 pb-8"
    >
      <p
        v-if="saveError"
        role="alert"
        class="whitespace-pre-line text-p-sm text-danger"
      >
        {{ saveError }}
      </p>
      <section class="flex flex-col gap-4">
        <SwitchRow
          v-model="form.enable_lead_pipeline"
          :label="__('Lead pipeline: meetings, MOM and automatic statuses')"
          :description="
            __(
              'Schedule meetings and write their minutes on the lead; the lead moves on as meetings happen; Closed – Won creates the deal.',
            )
          "
        />
        <FormControl
          v-model="form.meeting_reminder_minutes"
          class="max-w-xs"
          type="number"
          min="15"
          max="1440"
          step="1"
          :label="__('Meeting reminder (minutes before)')"
          :description="
            __(
              '15 to 1,440. The BDE also gets today\'s meetings in the morning digest.',
            )
          "
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import SwitchRow from '@/tbo/smartLeads/SwitchRow.vue'
import { Button, FormControl, createResource, toast } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import {
  errorMessage,
  load,
  methods,
  refreshAccess,
  savePipelineSettings,
} from './api'
import { reminderMinutes } from './pipeline'

const SWITCHES = ['enable_lead_pipeline']
const resource = createResource({ url: methods.settings })
load(resource)
const form = ref(null)
const saved = ref('')
const saving = ref(false)
const saveError = ref('')

watch(
  () => resource.data,
  (data) => {
    if (!data) return
    const values = { ...data.settings }
    for (const field of SWITCHES) values[field] = Boolean(values[field])
    form.value = values
    saved.value = JSON.stringify(values)
  },
  { immediate: true },
)

const dirty = computed(
  () => Boolean(form.value) && JSON.stringify(form.value) !== saved.value,
)

async function save() {
  saving.value = true
  saveError.value = ''
  try {
    const values = { ...form.value }
    for (const field of SWITCHES) values[field] = values[field] ? 1 : 0
    values.meeting_reminder_minutes = reminderMinutes(
      values.meeting_reminder_minutes,
    )
    if (values.meeting_reminder_minutes === null) {
      saveError.value = __(
        'The meeting reminder must be between 15 and 1,440 minutes.',
      )
      return
    }
    resource.data = await savePipelineSettings(values)
    refreshAccess()
    toast.success(__('Saved'))
  } catch (e) {
    saveError.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
