<template>
  <div class="flex flex-col gap-6">
    <div
      v-if="queue.loading && !queue.data"
      class="flex items-center justify-center gap-2 py-16 text-base text-ink-gray-6"
    >
      <LoadingIndicator class="size-4" />
      {{ __('Loading...') }}
    </div>
    <p v-else-if="queue.error" role="alert" class="text-p-base text-danger">
      {{ errorMessage(queue.error) }}
    </p>
    <template v-else-if="queue.data">
      <section :aria-labelledby="`${id}-waiting`" class="flex flex-col gap-2">
        <h2
          :id="`${id}-waiting`"
          class="text-base font-semibold text-ink-gray-9"
        >
          {{ __('Matched, waiting for verification') }}
          <span
            class="ml-1 font-mono text-sm font-normal tabular-nums text-ink-gray-5"
            >{{ queue.data.waiting.length }}</span
          >
        </h2>
        <p class="text-p-sm text-ink-gray-6">
          {{
            __(
              "Nothing counts as reconciled until a second person verifies it. Match lines in ERPNext's Bank Reconciliation Tool.",
            )
          }}
        </p>
        <ul
          class="flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-2"
        >
          <li
            v-if="!queue.data.waiting.length"
            class="px-4 py-6 text-center text-p-sm text-ink-gray-6"
          >
            {{ __('Nothing waiting.') }}
          </li>
          <li
            v-for="line in queue.data.waiting"
            :key="line.name"
            class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
          >
            <span class="font-mono text-base text-ink-gray-9">{{
              line.name
            }}</span>
            <span class="text-p-sm text-ink-gray-6">{{
              [date(line.date), line.reference_number, line.bank_account]
                .filter(Boolean)
                .join(' · ')
            }}</span>
            <span class="text-p-sm text-ink-gray-6">{{
              __('matched by {0}', [line.tbo_matched_by || '—'])
            }}</span>
            <span
              class="ml-auto whitespace-nowrap font-mono text-base tabular-nums text-ink-gray-9"
              >{{ money(line.amount, line.currency) }}</span
            >
            <Button
              v-if="line.can_verify"
              size="sm"
              variant="solid"
              :label="__('Verify')"
              :iconLeft="LucideBadgeCheck"
              :loading="busy === line.name"
              :disabled="Boolean(busy)"
              @click="verify(line)"
            />
            <span
              v-else-if="queue.data.can_verify"
              class="text-p-sm text-ink-gray-6"
              >{{ __('You matched it') }}</span
            >
          </li>
        </ul>
      </section>

      <section :aria-labelledby="`${id}-unmatched`" class="flex flex-col gap-2">
        <h2
          :id="`${id}-unmatched`"
          class="text-base font-semibold text-ink-gray-9"
        >
          {{ __('Not matched yet') }}
          <span
            class="ml-1 font-mono text-sm font-normal tabular-nums text-ink-gray-5"
            >{{ queue.data.unmatched.length }}</span
          >
        </h2>
        <ul
          class="flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-2"
        >
          <li
            v-if="!queue.data.unmatched.length"
            class="px-4 py-6 text-center text-p-sm text-ink-gray-6"
          >
            {{ __('Every line is matched.') }}
          </li>
          <li
            v-for="line in queue.data.unmatched"
            :key="line.name"
            class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
          >
            <span class="font-mono text-base text-ink-gray-9">{{
              line.name
            }}</span>
            <span class="text-p-sm text-ink-gray-6">{{
              [date(line.date), line.reference_number]
                .filter(Boolean)
                .join(' · ')
            }}</span>
            <span
              v-if="line.tbo_possible_duplicate_of"
              class="inline-flex items-center gap-1 text-p-sm text-warning"
            >
              <LucideCopy class="size-3.5 shrink-0" aria-hidden="true" />{{
                __('Possible duplicate of {0}', [
                  line.tbo_possible_duplicate_of,
                ])
              }}
            </span>
            <span
              class="text-p-sm"
              :class="line.age_days > 3 ? 'text-danger' : 'text-ink-gray-6'"
              >{{ __('{0} days', [line.age_days]) }}</span
            >
            <span
              class="ml-auto whitespace-nowrap font-mono text-base tabular-nums text-ink-gray-9"
              >{{ money(line.amount, line.currency) }}</span
            >
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { formatDate } from '@/utils'
import { formatCurrency } from '@/utils/numberFormat.js'
import { createResource, toast } from 'frappe-ui'
import { ref, useId } from 'vue'
import LucideBadgeCheck from '~icons/lucide/badge-check'
import LucideCopy from '~icons/lucide/copy'
import {
  errorMessage,
  load,
  reconciliationMethods,
  verifyBankLine,
} from './api'

const id = useId()
const busy = ref('')
const queue = createResource({ url: reconciliationMethods.queue })
load(queue)
defineExpose({ reload: () => load(queue) })

function money(value, currency) {
  return formatCurrency(value, '', currency)
}

function date(value) {
  return value ? formatDate(value, '', true) : '—'
}

async function verify(line) {
  if (busy.value) return
  busy.value = line.name
  try {
    await verifyBankLine(line.name)
    toast.success(__('{0} verified', [line.name]))
    // keep the row disabled until the refreshed queue no longer lists it
    await load(queue)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = ''
  }
}
</script>
