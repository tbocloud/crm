<template>
  <div class="flex h-full flex-col gap-6 px-6 py-8 text-ink-gray-8">
    <div class="flex items-start justify-between gap-4 px-2">
      <div class="flex flex-col gap-1">
        <h2 class="text-2xl-semibold leading-none">
          {{ __('TBO smart leads') }}
        </h2>
        <p class="text-p-base text-ink-gray-6">
          {{
            __(
              'AI providers, lead scoring, follow-ups and the triage. Each feature has its own switch and stays off until you turn it on.',
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

      <section class="flex flex-col gap-4" :aria-labelledby="ids.ai">
        <h3 :id="ids.ai" class="text-base font-semibold text-ink-gray-9">
          {{ __('AI providers') }}
        </h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormControl
            v-model="form.ai_primary_provider"
            type="select"
            :label="__('Primary provider')"
            :options="['OpenAI', 'Anthropic-compatible']"
          />
          <SwitchRow
            v-model="form.ai_failover"
            :label="__('Fall back to the other provider')"
            :description="
              __(
                'On billing, key, model, rate-limit, server or timeout failures.',
              )
            "
          />
        </div>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div
            v-for="provider in PROVIDERS"
            :key="provider.slot"
            class="flex flex-col gap-3 rounded-lg border border-outline-gray-2 p-4"
          >
            <div class="flex items-center justify-between gap-2">
              <h4 class="text-sm font-medium text-ink-gray-9">
                {{ provider.slot }}
              </h4>
              <span
                class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
                :class="badge(provider.slot).classes"
              >
                <component
                  :is="badge(provider.slot).icon"
                  class="size-3"
                  aria-hidden="true"
                />
                {{ __(badge(provider.slot).label) }}
              </span>
            </div>
            <p
              v-if="status?.providers?.[provider.slot]?.down"
              class="text-p-sm text-danger"
            >
              {{ status.providers[provider.slot].down.reason }}
            </p>
            <FormControl
              v-model="form[`${provider.prefix}_model`]"
              :label="__('Model')"
              :placeholder="provider.modelHint"
            />
            <FormControl
              v-model="form[`${provider.prefix}_base_url`]"
              :label="__('Base URL')"
              :placeholder="provider.urlHint"
            />
            <SecretField
              v-model="secrets[`${provider.prefix}_api_key`]"
              :label="__('API key')"
              :state="secretState[`${provider.prefix}_api_key`]"
            />
            <div class="grid grid-cols-2 gap-3">
              <FormControl
                v-model="form[`${provider.prefix}_input_price`]"
                type="number"
                min="0"
                step="0.01"
                :label="__('Input $ / 1M tokens')"
              />
              <FormControl
                v-model="form[`${provider.prefix}_output_price`]"
                type="number"
                min="0"
                step="0.01"
                :label="__('Output $ / 1M tokens')"
              />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                :label="__('Test connection')"
                :loading="testing === provider.slot"
                :disabled="dirty"
                :tooltip="
                  dirty
                    ? __('Save first: the test uses the saved settings.')
                    : ''
                "
                @click="test(provider.slot)"
              />
              <p
                v-if="tests[provider.slot]"
                role="status"
                class="text-p-sm"
                :class="
                  tests[provider.slot].ok ? 'text-success' : 'text-danger'
                "
              >
                {{ tests[provider.slot].message }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-4" :aria-labelledby="ids.scoring">
        <h3 :id="ids.scoring" class="text-base font-semibold text-ink-gray-9">
          {{ __('Lead scoring and Call today') }}
        </h3>
        <SwitchRow
          v-model="form.enable_lead_scoring"
          :label="__('Lead scoring and Call today')"
          :description="
            __(
              'Scores open leads every night and when they change; each salesperson gets a Call today list.',
            )
          "
        />
        <SwitchRow
          v-model="form.lead_scoring_use_ai"
          :label="__('AI reads notes to adjust scores')"
          :description="
            __(
              'At most 15 points either way, with the reason. Only leads whose notes or status changed are sent.',
            )
          "
        />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormControl
            v-model="form.call_today_size"
            type="number"
            min="5"
            max="30"
            :label="__('Leads in Call today (5–30)')"
          />
          <FormControl
            v-model="form.ai_daily_lead_limit"
            type="number"
            min="0"
            :label="__('AI scoring: leads per night')"
          />
        </div>
      </section>

      <section class="flex flex-col gap-4" :aria-labelledby="ids.followUps">
        <h3 :id="ids.followUps" class="text-base font-semibold text-ink-gray-9">
          {{ __('Follow-ups and escalation') }}
        </h3>
        <SwitchRow
          v-model="form.enable_lead_follow_ups"
          :label="__('Lead follow-ups and escalation')"
          :description="
            __(
              'Flags open leads with no follow-up, reminds on the day, escalates overdue ones on working days and sends the 09:30 digest. People on leave are skipped.',
            )
          "
        />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormControl
            v-model="form.lead_stale_days"
            type="number"
            min="1"
            :label="__('Re-engage after (days without a touch)')"
          />
          <Link
            v-model="form.lead_fallback_owner"
            doctype="User"
            :label="__('Fallback owner for disabled users\' leads')"
            :placeholder="__('None: list them under Needs owner')"
          />
          <FormControl
            v-model="form.lead_ladder_l1_days"
            type="number"
            min="1"
            :label="__('To the BDM after (working days overdue)')"
          />
          <FormControl
            v-model="form.lead_ladder_l2_days"
            type="number"
            min="1"
            :label="__('To the Sales & Marketing Head after')"
          />
          <FormControl
            v-model="form.lead_ladder_l3_days"
            type="number"
            min="1"
            :label="__('To the managers after')"
          />
          <Link
            v-model="form.lead_manager_role"
            doctype="Role"
            :label="__('Managers\' role')"
          />
          <Link
            v-model="form.escalation_sales_head"
            doctype="User"
            :label="__('Head - Sales & Marketing')"
            :placeholder="__('Else everyone with that role')"
          />
        </div>
        <SecretField
          v-model="secrets.teams_dm_workflow_url"
          :label="__('Teams DM workflow URL')"
          :description="
            __(
              'The Power Automate workflow that messages a person in Teams (the same one as the TBO Support hub). Blank: digests go by email.',
            )
          "
          :state="secretState.teams_dm_workflow_url"
        />
        <div class="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            :label="__('Send me a test digest')"
            :loading="digesting"
            :disabled="dirty || !form.enable_lead_follow_ups"
            @click="testDigest"
          />
          <p
            v-if="digestResult"
            role="status"
            class="text-p-sm"
            :class="digestResult.ok ? 'text-success' : 'text-ink-gray-7'"
          >
            {{ digestResult.message }}
          </p>
        </div>
      </section>

      <section class="flex flex-col gap-4" :aria-labelledby="ids.notes">
        <h3 :id="ids.notes" class="text-base font-semibold text-ink-gray-9">
          {{ __('AI notes and triage') }}
        </h3>
        <SwitchRow
          v-model="form.enable_lead_notes"
          :label="__('AI call notes, lead brief and WhatsApp drafts')"
          :description="
            __(
              'On the lead page and Call today. The AI only proposes; people confirm.',
            )
          "
        />
        <SwitchRow
          v-model="form.enable_lead_triage"
          :label="__('AI triage of stale leads')"
          :description="
            __(
              'Call today → Triage, for Sales Managers. Preview first; it never closes a lead.',
            )
          "
        />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormControl
            v-model="form.triage_max_leads"
            type="number"
            min="1"
            max="1000"
            :label="__('Triage: leads per run')"
          />
          <FormControl
            v-model="form.triage_daily_capacity"
            type="number"
            min="1"
            :label="__('Triage: follow-ups per person per day')"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import Link from '@/components/Controls/Link.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { Button, FormControl, createResource, toast } from 'frappe-ui'
import { computed, reactive, ref, watch } from 'vue'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideCircleCheck from '~icons/lucide/circle-check'
import LucideCircleDashed from '~icons/lucide/circle-dashed'
import LucideCirclePause from '~icons/lucide/circle-pause'
import SecretField from './SecretField.vue'
import SwitchRow from './SwitchRow.vue'
import {
  errorMessage,
  load,
  methods,
  refreshAccess,
  saveSettings,
  sendTestDigest,
  testConnection,
} from './api'

const PROVIDERS = [
  {
    slot: 'OpenAI',
    prefix: 'openai',
    modelHint: 'gpt-5.6-luna',
    urlHint: 'https://api.openai.com/v1',
  },
  {
    slot: 'Anthropic-compatible',
    prefix: 'anthropic',
    modelHint: 'kimi-k2.6',
    urlHint: 'https://api.moonshot.ai/anthropic',
  },
]
const SWITCHES = [
  'ai_failover',
  'enable_lead_scoring',
  'lead_scoring_use_ai',
  'enable_lead_follow_ups',
  'enable_lead_notes',
  'enable_lead_triage',
]
const ids = {
  ai: 'tbo-sl-ai',
  scoring: 'tbo-sl-scoring',
  followUps: 'tbo-sl-follow-ups',
  notes: 'tbo-sl-notes',
}

const resource = createResource({ url: methods.settings })
load(resource)
const form = ref(null)
const saved = ref('')
// a typed secret replaces the stored one; "" removes it; null keeps it
const secrets = reactive({
  openai_api_key: null,
  anthropic_api_key: null,
  teams_dm_workflow_url: null,
})
const secretState = computed(() => resource.data?.secrets || {})
const status = computed(() => resource.data?.status)
const saving = ref(false)
const saveError = ref('')
const testing = ref('')
const tests = reactive({})
const digesting = ref(false)
const digestResult = ref(null)

watch(
  () => resource.data,
  (data) => {
    if (!data) return
    const values = { ...data.settings }
    for (const field of SWITCHES) values[field] = Boolean(values[field])
    form.value = values
    saved.value = JSON.stringify(values)
    for (const key of Object.keys(secrets)) secrets[key] = null
  },
  { immediate: true },
)

const dirty = computed(
  () =>
    Boolean(form.value) &&
    (JSON.stringify(form.value) !== saved.value ||
      Object.values(secrets).some((value) => value !== null)),
)

async function save() {
  saving.value = true
  saveError.value = ''
  try {
    const values = { ...form.value }
    for (const field of SWITCHES) values[field] = values[field] ? 1 : 0
    for (const [key, value] of Object.entries(secrets))
      if (value !== null) values[key] = value
    resource.data = await saveSettings(values)
    refreshAccess()
    toast.success(__('Saved'))
  } catch (e) {
    saveError.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

async function test(slot) {
  testing.value = slot
  try {
    tests[slot] = await testConnection(slot)
    load(resource)
  } catch (e) {
    tests[slot] = { ok: false, message: errorMessage(e) }
  } finally {
    testing.value = ''
  }
}

async function testDigest() {
  digesting.value = true
  try {
    digestResult.value = await sendTestDigest()
  } catch (e) {
    digestResult.value = { ok: false, message: errorMessage(e) }
  } finally {
    digesting.value = false
  }
}

function badge(slot) {
  const state = status.value?.providers?.[slot]
  if (!state?.configured)
    return {
      label: 'Not set up',
      classes: 'bg-surface-gray-2 text-ink-gray-7',
      icon: LucideCircleDashed,
    }
  if (!status.value.order?.includes(slot))
    return {
      label: 'Not used',
      classes: 'bg-surface-gray-2 text-ink-gray-7',
      icon: LucideCircleDashed,
    }
  if (state.paused)
    return {
      label: 'Paused',
      classes: 'bg-warning-soft text-warning',
      icon: LucideCirclePause,
    }
  if (state.down)
    return {
      label: 'Failing',
      classes: 'bg-danger-soft text-danger',
      icon: LucideCircleAlert,
    }
  return {
    label: status.value.in_use === slot ? 'Answering' : 'Fallback',
    classes: 'bg-success-soft text-success',
    icon: LucideCircleCheck,
  }
}
</script>
