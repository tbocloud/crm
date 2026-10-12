<template>
  <Dialog v-model:open="open" :title="copy.title" size="md" @close="reset">
    <template #default>
      <div v-if="request" class="-mt-3 mb-4 text-p-base text-ink-gray-7">
        {{ __(request.kind) }} ·
        <span class="font-mono text-ink-gray-9">{{ request.quotation }}</span>
        · {{ request.customer }}
        <div class="mt-1 font-mono tabular-nums text-ink-gray-9">
          {{ formatPercent(request.previous_percent) }}
          <span aria-hidden="true">→</span>
          <span class="sr-only">{{ __('to') }}</span>
          {{ formatPercent(request.requested_percent) }}
          <span class="font-sans text-ink-gray-6">
            {{ __('requested by {0}', [request.requested_by_name]) }}
          </span>
        </div>
        <p
          v-if="request.reason"
          class="mt-2 whitespace-pre-line text-p-sm text-ink-gray-8"
        >
          “{{ request.reason }}”
        </p>
      </div>
      <form
        :id="formId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="submit"
      >
        <div v-if="needsPercent">
          <FormControl
            v-model="percent"
            type="number"
            :label="__('Approve %')"
            min="0.01"
            :max="maxPercent"
            step="0.01"
          />
          <p class="mt-1.5 text-p-sm text-ink-gray-6">{{ percentHint }}</p>
        </div>
        <FormControl
          v-model="remarks"
          type="textarea"
          :label="copy.remarksLabel"
          :required="remarksRequired"
          :rows="3"
        />
      </form>
    </template>
    <template #actions>
      <div class="flex flex-col gap-3">
        <p
          v-if="error"
          role="alert"
          class="whitespace-pre-line text-p-sm text-danger"
        >
          {{ error }}
        </p>
        <div class="flex justify-end gap-2">
          <Button :label="__('Cancel')" @click="open = false" />
          <Button
            type="submit"
            :form="formId"
            :variant="action === 'reject' ? 'subtle' : 'solid'"
            :theme="action === 'reject' ? 'red' : 'gray'"
            :label="copy.submit"
            :loading="saving"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { decideAdjustment, errorMessage } from './api'
import { formatPercent } from './status'
import { Dialog, FormControl, toast } from 'frappe-ui'
import { computed, ref, watch } from 'vue'

const props = defineProps({
  // a row from get_pending_approvals or get_adjustment_requests
  request: { type: Object, default: null },
  // approve | reject | forward | override
  action: { type: String, default: 'approve' },
  // for approve: { max, default } from requestActions
  approve: { type: Object, default: null },
})
const emit = defineEmits(['decided'])

const open = defineModel({ type: Boolean })
const formId = `tbo-decide-${Math.random().toString(36).slice(2, 8)}`
const percent = ref('')
const remarks = ref('')
const error = ref('')
const saving = ref(false)

const COPY = {
  approve: {
    title: __('Approve request'),
    submit: __('Approve'),
    remarksLabel: __('Remarks (optional)'),
    done: __('Approved'),
  },
  reject: {
    title: __('Reject request'),
    submit: __('Reject'),
    remarksLabel: __('Reason for rejecting'),
    done: __('Rejected'),
  },
  forward: {
    title: __('Forward to the next level'),
    submit: __('Forward'),
    remarksLabel: __('Remarks (optional)'),
    done: __('Forwarded'),
  },
  override: {
    title: __('Override as CEO'),
    submit: __('Override'),
    remarksLabel: __('Reason for the override'),
    done: __('Overridden'),
  },
}
const copy = computed(() => COPY[props.action] || COPY.approve)
const needsPercent = computed(() =>
  ['approve', 'override'].includes(props.action),
)
const remarksRequired = computed(() =>
  ['reject', 'override'].includes(props.action),
)
const maxPercent = computed(() =>
  props.action === 'override' ? 100 : props.approve?.max,
)
const percentHint = computed(() => {
  if (props.action === 'override') {
    return __('Any percentage; an override always needs a reason.')
  }
  const requested = Number(props.request?.requested_percent)
  if (props.approve?.max < requested) {
    return __('Above your limit: you can approve up to {0}, or forward it.', [
      formatPercent(props.approve.max),
    ])
  }
  return __('Approve in full, or a lower percentage.')
})

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    percent.value =
      props.action === 'override'
        ? props.request?.requested_percent
        : props.approve?.default
  },
  { immediate: true },
)

function reset() {
  remarks.value = ''
  error.value = ''
}

async function submit() {
  const args = { name: props.request.name, action: props.action }
  if (needsPercent.value) {
    const value = Number(percent.value)
    if (!(value > 0 && value <= maxPercent.value)) {
      error.value = __('Enter a percentage above 0 and at most {0}.', [
        formatPercent(maxPercent.value),
      ])
      return
    }
    args.percent = value
  }
  if (remarksRequired.value && !remarks.value.trim()) {
    error.value = __('Give a reason.')
    return
  }
  if (remarks.value.trim()) args.remarks = remarks.value.trim()
  error.value = ''
  saving.value = true
  try {
    const result = await decideAdjustment(args)
    toast.success(`${copy.value.done}: ${result.quotation}`)
    open.value = false
    reset()
    emit('decided', result)
  } catch (e) {
    error.value = errorMessage(e) || __('Could not save the decision.')
  } finally {
    saving.value = false
  }
}
</script>
