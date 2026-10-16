<template>
  <Dialog v-model:open="open" :title="__('Revision history')" size="2xl">
    <template #default>
      <div
        v-if="resource.loading && !resource.data"
        class="flex items-center gap-2 py-8 text-base text-ink-gray-6"
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
      <ol v-else-if="resource.data" class="flex flex-col gap-3">
        <li
          v-for="row in [...resource.data].reverse()"
          :key="row.name"
          class="rounded-lg border border-outline-gray-2 p-3"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono text-base font-medium text-ink-gray-9">{{
              row.name
            }}</span>
            <span class="text-xs text-ink-gray-6">{{
              __('Revision {0}', [row.revision])
            }}</span>
            <span
              v-if="row.is_latest"
              class="rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand-ink"
              >{{ __('Latest') }}</span
            >
            <StatusChip
              :label="row.status || 'Draft'"
              v-bind="quoteTone(row.status)"
            />
            <span class="ml-auto font-mono tabular-nums text-ink-gray-9">{{
              formatCurrency(row.grand_total, '', row.currency)
            }}</span>
          </div>
          <p class="mt-1 text-p-sm text-ink-gray-6">
            {{ row.transaction_date }} ·
            {{ __('Discount {0}%', [row.discount_percent]) }} ·
            {{ __('valid till {0}', [row.valid_till || '–']) }}
          </p>
          <ul
            v-if="row.changes"
            class="mt-2 flex flex-col gap-0.5 text-p-sm text-ink-gray-8"
          >
            <li
              v-for="line in changeLines(row.changes)"
              :key="line"
              class="flex gap-1.5"
            >
              <span aria-hidden="true" class="text-ink-gray-5">·</span
              >{{ line }}
            </li>
          </ul>
          <p v-else class="mt-2 text-p-sm text-ink-gray-6">
            {{ __('First version') }}
          </p>
        </li>
      </ol>
    </template>
  </Dialog>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { formatCurrency } from '@/utils/numberFormat.js'
import { Dialog, createResource } from 'frappe-ui'
import { watch } from 'vue'
import StatusChip from './StatusChip.vue'
import { errorMessage, leadQuotationMethods, load } from './api'
import { changeLines, quoteTone } from './quotes'

const props = defineProps({ quotation: { type: String, required: true } })
const open = defineModel({ type: Boolean })
const resource = createResource({ url: leadQuotationMethods.revisions })
watch(
  open,
  (isOpen) => isOpen && load(resource, { quotation: props.quotation }),
  { immediate: true },
)
</script>
