<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex justify-end">
      <div
        class="absolute inset-0 bg-black-overlay-200 dark:bg-black-overlay-700"
        aria-hidden="true"
        @click="close"
      />
      <section
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="relative flex h-full w-full max-w-md flex-col border-l border-outline-gray-2 bg-surface-elevation-1 shadow-xl"
        @keydown="onKeydown"
      >
        <header
          class="flex items-start justify-between gap-3 border-b border-outline-gray-1 px-4 py-3 sm:px-5"
        >
          <div class="min-w-0">
            <h2 :id="titleId" class="text-lg font-semibold text-ink-gray-9">
              {{ __('Approval trail') }}
            </h2>
            <p class="mt-0.5 truncate font-mono text-sm text-ink-gray-6">
              {{ name }}
            </p>
          </div>
          <Button
            ref="closeButton"
            variant="ghost"
            :label="__('Close')"
            :icon="LucideX"
            @click="close"
          />
        </header>

        <div class="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div
            v-if="trail.loading && !trail.data"
            class="flex items-center gap-2 text-base text-ink-gray-6"
          >
            <LoadingIndicator class="size-4" />
            {{ __('Loading...') }}
          </div>
          <div
            v-else-if="trail.error"
            role="alert"
            class="rounded border border-outline-gray-2 p-3 text-p-sm text-ink-gray-8"
          >
            <p class="font-medium text-danger">
              {{ __('Could not load the trail') }}
            </p>
            <p class="mt-1 whitespace-pre-line">
              {{ errorMessage(trail.error) }}
            </p>
            <Button
              class="mt-3"
              :label="__('Try again')"
              @click="load(trail, { name })"
            />
          </div>
          <template v-else-if="data">
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div class="col-span-2 flex flex-wrap items-center gap-2">
                <AdjustmentChip
                  :label="stage.label"
                  :tone="stage.tone"
                  :voided="data.voided"
                  :prefix="__(data.kind)"
                />
              </div>
              <div>
                <dt class="text-ink-gray-5">{{ __('Quotation') }}</dt>
                <dd class="font-mono text-ink-gray-9">{{ data.quotation }}</dd>
              </div>
              <div>
                <dt class="text-ink-gray-5">{{ __('Customer') }}</dt>
                <dd class="truncate text-ink-gray-9">
                  {{ data.customer || '—' }}
                </dd>
              </div>
              <div>
                <dt class="text-ink-gray-5">{{ __('Requested') }}</dt>
                <dd class="font-mono tabular-nums text-ink-gray-9">
                  {{ formatPercent(data.previous_percent) }}
                  <span aria-hidden="true">→</span>
                  <span class="sr-only">{{ __('to') }}</span>
                  {{ formatPercent(data.requested_percent) }}
                </dd>
              </div>
              <div>
                <dt class="text-ink-gray-5">{{ __('Requested by') }}</dt>
                <dd class="truncate text-ink-gray-9">
                  {{ data.requested_by_name }}
                </dd>
              </div>
              <div v-if="data.reason" class="col-span-2">
                <dt class="text-ink-gray-5">{{ __('Reason') }}</dt>
                <dd class="whitespace-pre-line text-p-sm text-ink-gray-9">
                  {{ data.reason }}
                </dd>
              </div>
            </dl>

            <h3 class="mb-2 mt-6 text-base font-medium text-ink-gray-9">
              {{ __('Steps') }}
            </h3>
            <ol class="relative flex flex-col">
              <li
                v-for="(step, i) in data.steps"
                :key="i"
                class="relative flex gap-3 pb-4 last:pb-0"
              >
                <span
                  v-if="i < data.steps.length - 1"
                  class="absolute left-[5px] top-4 h-full border-l border-outline-gray-2"
                  aria-hidden="true"
                />
                <span
                  class="relative mt-1.5 size-[11px] shrink-0 rounded-full ring-2 ring-[var(--surface-elevation-1)]"
                  :class="stepDot(step.action)"
                  aria-hidden="true"
                />
                <div class="min-w-0 flex-1 text-sm">
                  <div class="flex flex-wrap items-baseline gap-x-2">
                    <span class="font-medium text-ink-gray-9">
                      {{ __(step.action) }}
                    </span>
                    <span
                      v-if="step.percent"
                      class="font-mono tabular-nums text-ink-gray-8"
                    >
                      {{ formatPercent(step.percent) }}
                    </span>
                  </div>
                  <div class="text-ink-gray-6">
                    {{ step.by_name }}
                    <template v-if="step.level"> · {{ step.level }}</template>
                    ·
                    <time
                      :datetime="step.at"
                      :title="formatDate(step.at)"
                      class="tabular-nums"
                    >
                      {{ timeAgo(step.at) }}
                    </time>
                  </div>
                  <p
                    v-if="step.remarks"
                    class="mt-1 whitespace-pre-line text-p-sm text-ink-gray-8"
                  >
                    {{ step.remarks }}
                  </p>
                </div>
              </li>
            </ol>
          </template>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import LucideX from '~icons/lucide/x'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import AdjustmentChip from './AdjustmentChip.vue'
import { errorMessage, load, methods } from './api'
import { formatPercent, requestStage } from './status'
import { formatDate, timeAgo } from '@/utils'
import { Button, createResource } from 'frappe-ui'
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
})

const open = defineModel({ type: Boolean })
const titleId = `tbo-trail-${Math.random().toString(36).slice(2, 8)}`
const panel = ref(null)
const closeButton = ref(null)
let returnFocus = null

const trail = createResource({ url: methods.trail })
const data = computed(() => trail.data)
const stage = computed(() => (data.value ? requestStage(data.value) : null))

watch(
  () => [open.value, props.name],
  async ([isOpen, name]) => {
    if (!isOpen || !name) return
    returnFocus = document.activeElement
    trail.reset()
    load(trail, { name })
    await nextTick()
    closeButton.value?.$el?.focus?.()
  },
  { immediate: true },
)

function close() {
  open.value = false
  returnFocus?.focus?.()
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  // keep focus inside the panel while it is open
  const focusable = panel.value?.querySelectorAll(
    'button:not([disabled]), [href], input, textarea, [tabindex]:not([tabindex="-1"])',
  )
  if (!focusable?.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const DOTS = {
  Requested: 'bg-surface-gray-6',
  Applied: 'bg-surface-gray-6',
  Forwarded: 'bg-info',
  Approved: 'bg-success',
  Overridden: 'bg-success',
  Rejected: 'bg-danger',
  Voided: 'bg-surface-gray-5',
}
function stepDot(action) {
  return DOTS[action] || 'bg-surface-gray-6'
}
</script>
