<template>
  <Dialog
    v-model:open="open"
    :title="__('Request approval')"
    size="md"
    @close="reset"
  >
    <template #default>
      <p class="-mt-3 mb-4 text-p-base text-ink-gray-7">
        {{ __('Quotation') }}
        <span class="font-mono text-ink-gray-9">{{ quotation }}</span>
      </p>
      <form
        :id="formId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="submit"
      >
        <FormControl
          v-if="kindOptions.length > 1"
          v-model="kind"
          type="select"
          :label="__('Kind')"
          :options="kindOptions"
        />
        <div>
          <FormControl
            v-model="percent"
            type="number"
            :label="__('{0} %', [__(kind)])"
            min="0.01"
            max="100"
            step="0.01"
            required
          />
          <p class="mt-1.5 text-p-sm text-ink-gray-6">
            {{ __('Your limit: {0}', [limitLabel]) }}
            <template v-if="kind === 'Discount'">
              ·
              {{
                __(
                  'item discounts, lower rates and the additional discount all count',
                )
              }}
            </template>
          </p>
        </div>
        <FormControl
          v-model="reason"
          type="textarea"
          :label="__('Reason')"
          :placeholder="__('Why this customer needs it')"
          required
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
            variant="solid"
            type="submit"
            :form="formId"
            :label="__('Send request')"
            :loading="saving"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { errorMessage, refreshAccess, requestAdjustment } from './api'
import { Dialog, FormControl, toast } from 'frappe-ui'
import { computed, ref, watch } from 'vue'

const props = defineProps({
  quotation: { type: String, required: true },
  // the requestable kinds' status rows from get_quotation_adjustment_status
  kinds: { type: Array, required: true },
})
const emit = defineEmits(['requested'])

const open = defineModel({ type: Boolean })
const formId = `tbo-request-${Math.random().toString(36).slice(2, 8)}`
const kind = ref('')
const percent = ref('')
const reason = ref('')
const error = ref('')
const saving = ref(false)

const kindOptions = computed(() =>
  props.kinds.map((row) => ({ label: __(row.kind), value: row.kind })),
)
const current = computed(() =>
  props.kinds.find((row) => row.kind === kind.value),
)
const limitLabel = computed(() => current.value?.limit_label || __('not set'))

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      // Cancel closes through v-model, which skips the Dialog's close event
      reset()
      kind.value = props.kinds[0]?.kind || 'Discount'
      percent.value = props.kinds[0]?.percent || ''
    }
  },
  { immediate: true },
)
watch(kind, () => {
  if (current.value) percent.value = current.value.percent
})

function reset() {
  reason.value = ''
  error.value = ''
}

async function submit() {
  const value = Number(percent.value)
  if (!(value > 0 && value <= 100)) {
    error.value = __('Enter a percentage above 0 and at most 100.')
    return
  }
  if (!reason.value.trim()) {
    error.value = __('Give a reason for the request.')
    return
  }
  error.value = ''
  saving.value = true
  try {
    const request = await requestAdjustment({
      quotation: props.quotation,
      kind: kind.value,
      percent: value,
      reason: reason.value.trim(),
    })
    toast.success(__('Sent to {0} for approval', [request.current_level]))
    open.value = false
    reset()
    refreshAccess()
    emit('requested', request)
  } catch (e) {
    error.value = errorMessage(e) || __('Could not send the request.')
  } finally {
    saving.value = false
  }
}
</script>
