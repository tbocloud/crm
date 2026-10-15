<template>
  <div class="flex flex-col gap-4">
    <div
      class="flex flex-col gap-3 rounded-lg border border-outline-gray-2 p-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="flex flex-col gap-1">
        <h2 class="text-base font-medium text-ink-gray-9">
          {{ __('Triage of stale leads') }}
        </h2>
        <p class="text-p-sm text-ink-gray-6">
          {{
            __(
              'The AI reads the open leads with no follow-up (New, or untouched for weeks) and sorts them into Call again or Suggest close. The preview changes nothing. Applying it only creates follow-ups; closing a lead is always your call.',
            )
          }}
        </p>
      </div>
      <Button
        :variant="canApply ? 'outline' : 'solid'"
        :label="__('Run a preview')"
        :iconLeft="LucideSparkles"
        :loading="starting"
        :disabled="running"
        @click="start"
      />
    </div>

    <div
      v-if="run.loading && !run.data"
      class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
    >
      <LoadingIndicator class="size-4" />
      {{ __('Loading...') }}
    </div>

    <StateMessage
      v-else-if="run.error"
      role="alert"
      :icon="LucideCircleAlert"
      :title="__('Could not load the triage')"
      :description="errorMessage(run.error)"
    >
      <Button :label="__('Try again')" @click="reload" />
    </StateMessage>

    <StateMessage
      v-else-if="!data"
      :icon="LucideListFilter"
      :title="__('No triage yet')"
      :description="__('Run a preview to see what the AI suggests.')"
    />

    <template v-else>
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-1 text-p-sm text-ink-gray-7"
        aria-live="polite"
      >
        <span class="inline-flex items-center gap-1.5">
          <LoadingIndicator v-if="running" class="size-3.5" />
          <component
            :is="statusIcon"
            v-else
            class="size-4 text-ink-gray-5"
            aria-hidden="true"
          />
          {{ __(data.status) }}
        </span>
        <span v-if="!running" class="tabular-nums">
          {{ __('{0} leads', [data.lead_count]) }} ·
          {{ __('{0} call again', [data.call_again]) }} ·
          {{ __('{0} suggest close', [data.suggest_close]) }}
          <template v-if="data.skipped">
            · {{ __('{0} without an answer', [data.skipped]) }}</template
          >
        </span>
        <span
          v-if="data.estimated_cost_usd"
          class="tabular-nums text-ink-gray-6"
        >
          {{ __('AI cost about ${0}', [data.estimated_cost_usd]) }}
        </span>
      </div>
      <p v-if="data.error" role="alert" class="text-p-sm text-danger">
        {{ data.error }}
      </p>

      <template v-if="!running && data.rows.length">
        <section class="flex flex-col gap-2" :aria-label="__('Call again')">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-medium text-ink-gray-8">
              {{ __('Call again') }}
              <span class="font-mono tabular-nums text-ink-gray-5">{{
                split.callAgain.length
              }}</span>
            </h3>
            <Button
              v-if="canApply"
              variant="solid"
              :label="__('Create {0} follow-ups', [plannable])"
              :loading="applying"
              :disabled="!plannable"
              @click="confirmApply = true"
            />
          </div>
          <ul
            class="flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-2"
          >
            <li
              v-for="row in split.callAgain"
              :key="row.lead"
              class="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
            >
              <router-link
                :to="{ name: 'Lead', params: { leadId: row.lead } }"
                class="min-w-0 truncate text-ink-gray-9 hover:underline sm:w-48"
              >
                {{ row.lead_name || row.lead }}
              </router-link>
              <span class="min-w-0 flex-1 text-p-sm text-ink-gray-7">{{
                row.reason
              }}</span>
              <span class="shrink-0 text-p-sm text-ink-gray-6">
                <template v-if="row.task">{{
                  __('Follow-up created')
                }}</template>
                <template v-else-if="row.follow_up_on">
                  <span class="font-mono tabular-nums">{{
                    row.follow_up_on
                  }}</span>
                  · {{ row.assign_to_name || row.assign_to }}
                </template>
                <template v-else>{{ __('Needs an owner first') }}</template>
              </span>
            </li>
          </ul>
        </section>

        <section class="flex flex-col gap-2" :aria-label="__('Suggest close')">
          <div
            class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <h3 class="text-sm font-medium text-ink-gray-8">
              {{ __('Suggest close') }}
              <span class="font-mono tabular-nums text-ink-gray-5">{{
                split.suggestClose.length
              }}</span>
            </h3>
            <div class="flex items-center gap-2">
              <FormControl
                v-model="closeStatus"
                type="select"
                :aria-label="__('Close as')"
                :options="[
                  { label: __('Close as Junk'), value: 'Junk' },
                  { label: __('Close as Unqualified'), value: 'Unqualified' },
                ]"
              />
              <Button
                :label="__('Close {0} selected', [toClose.length])"
                :disabled="!toClose.length"
                :loading="closing"
                @click="confirmClose = true"
              />
            </div>
          </div>
          <p class="text-p-sm text-ink-gray-6">
            {{ __('Nothing here is closed until you tick it and confirm.') }}
          </p>
          <ul
            class="flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-2"
          >
            <li
              v-for="row in split.suggestClose"
              :key="row.lead"
              class="flex items-start gap-3 px-3 py-2"
            >
              <input
                v-model="toClose"
                type="checkbox"
                class="mt-1 rounded border-outline-gray-3"
                :value="row.lead"
                :disabled="Boolean(row.closed_as)"
                :aria-label="__('Close {0}', [row.lead_name || row.lead])"
              />
              <div class="min-w-0 flex-1">
                <router-link
                  :to="{ name: 'Lead', params: { leadId: row.lead } }"
                  class="text-ink-gray-9 hover:underline"
                >
                  {{ row.lead_name || row.lead }}
                </router-link>
                <p class="text-p-sm text-ink-gray-7">{{ row.reason }}</p>
              </div>
              <span
                v-if="row.closed_as"
                class="shrink-0 text-p-sm text-ink-gray-6"
                >{{ __('Closed as {0}', [__(row.closed_as)]) }}</span
              >
            </li>
          </ul>
        </section>
      </template>
    </template>

    <Dialog
      v-model:open="confirmApply"
      :title="__('Create the follow-ups?')"
      size="sm"
    >
      <template #default>
        <p class="text-p-base text-ink-gray-7">
          {{
            __(
              '{0} Sales follow-up tasks are created, from the next working day on, at most the daily capacity per person. No lead is closed or changed.',
              [plannable],
            )
          }}
        </p>
      </template>
      <template #actions>
        <div class="flex justify-end gap-2">
          <Button :label="__('Cancel')" @click="confirmApply = false" />
          <Button
            variant="solid"
            :label="__('Create follow-ups')"
            :loading="applying"
            @click="apply"
          />
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:open="confirmClose"
      :title="__('Close these leads?')"
      size="sm"
    >
      <template #default>
        <p class="text-p-base text-ink-gray-7">
          {{
            __(
              "{0} leads become {1}, with the AI's reason as the lost note. You can reopen a lead from its page.",
              [toClose.length, __(closeStatus)],
            )
          }}
        </p>
      </template>
      <template #actions>
        <div class="flex justify-end gap-2">
          <Button :label="__('Cancel')" @click="confirmClose = false" />
          <Button
            variant="solid"
            theme="red"
            :label="__('Close leads')"
            :loading="closing"
            @click="closeLeads"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import StateMessage from '@/tbo/quotationApprovals/StateMessage.vue'
import { Button, Dialog, FormControl, createResource, toast } from 'frappe-ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideCircleCheck from '~icons/lucide/circle-check'
import LucideListFilter from '~icons/lucide/list-filter'
import LucideSparkles from '~icons/lucide/sparkles'
import {
  applyTriage,
  closeTriageLeads,
  errorMessage,
  load,
  methods,
  startTriage,
} from './api'
import { splitTriage } from './smartLeads'

const POLL_MS = 4000
const run = createResource({ url: methods.triage })
const data = computed(() => run.data)
const running = computed(() =>
  ['Queued', 'Running'].includes(data.value?.status),
)
const canApply = computed(() => data.value?.status === 'Ready')
const split = computed(() => splitTriage(data.value?.rows))
const plannable = computed(
  () =>
    split.value.callAgain.filter((row) => row.follow_up_on && !row.task).length,
)
const statusIcon = computed(() =>
  data.value?.status === 'Failed' ? LucideCircleAlert : LucideCircleCheck,
)
const starting = ref(false)
const applying = ref(false)
const closing = ref(false)
const confirmApply = ref(false)
const confirmClose = ref(false)
const closeStatus = ref('Junk')
const toClose = ref([])

function reload() {
  load(run)
}
reload()

let timer = null
watch(running, (busy) => {
  clearInterval(timer)
  if (busy)
    timer = setInterval(() => load(run, { run: data.value.name }), POLL_MS)
})
onBeforeUnmount(() => clearInterval(timer))

async function start() {
  starting.value = true
  try {
    run.data = await startTriage()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    starting.value = false
  }
}

async function apply() {
  applying.value = true
  try {
    const result = await applyTriage(data.value.name)
    run.data = result.run
    toast.success(__('{0} follow-ups created', [result.created]))
    confirmApply.value = false
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    applying.value = false
  }
}

async function closeLeads() {
  closing.value = true
  try {
    const result = await closeTriageLeads(
      data.value.name,
      toClose.value,
      closeStatus.value,
    )
    run.data = result.run
    toast.success(__('{0} leads closed', [result.closed.length]))
    toClose.value = []
    confirmClose.value = false
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    closing.value = false
  }
}
</script>
