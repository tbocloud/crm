<template>
  <div class="flex flex-col gap-4">
    <p class="text-p-sm text-ink-gray-6">
      {{
        __(
          'Open leads whose owner is disabled or missing. Nobody gets their reminders until you give them to someone (or set a fallback owner in the settings).',
        )
      }}
    </p>

    <div
      v-if="rows.loading && !rows.data"
      class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
    >
      <LoadingIndicator class="size-4" />
      {{ __('Loading...') }}
    </div>

    <StateMessage
      v-else-if="rows.error"
      role="alert"
      :icon="LucideCircleAlert"
      :title="__('Could not load the leads')"
      :description="errorMessage(rows.error)"
    >
      <Button :label="__('Try again')" @click="reload" />
    </StateMessage>

    <StateMessage
      v-else-if="rows.data && !rows.data.length"
      :icon="LucideUserCheck"
      :title="__('Every open lead has an active owner')"
    />

    <template v-else-if="rows.data">
      <p
        v-if="people.error"
        role="alert"
        class="flex flex-wrap items-center gap-2 text-p-sm text-danger"
      >
        {{ __('Could not load the salespeople: {0}', [errorMessage(people.error)]) }}
        <Button size="sm" :label="__('Try again')" @click="load(people)" />
      </p>
      <div
        class="flex flex-col gap-3 rounded-lg border border-outline-gray-2 p-3 sm:flex-row sm:items-end"
      >
        <FormControl
          v-model="assignee"
          class="sm:w-72"
          type="select"
          :label="__('Give the selected leads to')"
          :options="[
            { label: __('Choose a salesperson'), value: '' },
            ...peopleOptions,
          ]"
        />
        <Button
          variant="solid"
          :label="__('Reassign {0}', [selected.length])"
          :disabled="!assignee || !selected.length"
          :loading="saving"
          @click="reassign"
        />
        <p v-if="error" role="alert" class="text-p-sm text-danger">
          {{ error }}
        </p>
      </div>

      <div class="overflow-x-auto rounded-lg border border-outline-gray-2">
        <table class="w-full min-w-[36rem] text-base">
          <caption class="sr-only">
            {{
              __('Leads that need an owner')
            }}
          </caption>
          <thead
            class="border-b border-outline-gray-2 bg-surface-gray-1 text-left text-sm text-ink-gray-6"
          >
            <tr>
              <th scope="col" class="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  class="rounded border-outline-gray-3"
                  :checked="allSelected"
                  :aria-label="__('Select all')"
                  @change="toggleAll"
                />
              </th>
              <th scope="col" class="px-3 py-2 font-medium">
                {{ __('Lead') }}
              </th>
              <th scope="col" class="px-3 py-2 font-medium">
                {{ __('Status') }}
              </th>
              <th scope="col" class="px-3 py-2 font-medium">
                {{ __('Owner') }}
              </th>
              <th scope="col" class="px-3 py-2 font-medium">
                {{ __('Score') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-gray-1">
            <tr v-for="row in rows.data" :key="row.id">
              <td class="px-3 py-2">
                <input
                  v-model="selected"
                  type="checkbox"
                  class="rounded border-outline-gray-3"
                  :value="row.id"
                  :aria-label="__('Select {0}', [row.lead_name || row.id])"
                />
              </td>
              <td class="px-3 py-2">
                <router-link
                  :to="{ name: 'Lead', params: { leadId: row.id } }"
                  class="text-ink-gray-9 hover:underline"
                >
                  {{ row.lead_name || row.id }}
                </router-link>
                <p v-if="row.organization" class="text-p-sm text-ink-gray-6">
                  {{ row.organization }}
                </p>
              </td>
              <td class="px-3 py-2 text-ink-gray-7">{{ __(row.status) }}</td>
              <td class="px-3 py-2 text-ink-gray-7">
                {{ row.owner_name || row.owner || __('Nobody') }}
              </td>
              <td class="px-3 py-2">
                <BandChip :band="row.band || 'Cold'" :score="row.score" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import StateMessage from '@/tbo/quotationApprovals/StateMessage.vue'
import { Button, FormControl, createResource, toast } from 'frappe-ui'
import { computed, ref } from 'vue'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideUserCheck from '~icons/lucide/user-check'
import BandChip from './BandChip.vue'
import { errorMessage, load, methods, reassignLeads } from './api'

const rows = createResource({ url: methods.needsOwner })
const people = createResource({ url: methods.people })
const selected = ref([])
const assignee = ref('')
const saving = ref(false)
const error = ref('')
const peopleOptions = computed(() =>
  (people.data || []).map((user) => ({
    label: user.full_name || user.user,
    value: user.user,
  })),
)
const allSelected = computed(
  () =>
    Boolean(rows.data?.length) && selected.value.length === rows.data.length,
)

function reload() {
  load(rows)
}
reload()
load(people)

function toggleAll() {
  selected.value = allSelected.value ? [] : rows.data.map((row) => row.id)
}

async function reassign() {
  saving.value = true
  error.value = ''
  try {
    const { moved } = await reassignLeads(selected.value, assignee.value)
    toast.success(__('{0} leads reassigned', [moved.length]))
    selected.value = []
    reload()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
