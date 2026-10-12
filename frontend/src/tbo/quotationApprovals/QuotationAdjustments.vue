<template>
  <div
    v-if="status?.kinds?.length"
    class="flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 text-sm"
  >
    <div
      v-for="row in rows"
      :key="row.kind"
      class="flex flex-wrap items-center gap-x-2 gap-y-1"
    >
      <AdjustmentChip
        :label="row.chip.label"
        :tone="row.chip.tone"
        :prefix="__(row.kind)"
      />
      <span class="text-xs text-ink-gray-6">
        {{ __('Your limit:') }}
        <span class="font-mono tabular-nums">{{ row.limit_label }}</span>
      </span>
      <Button
        v-if="row.latest && !row.latest.within_limit"
        variant="ghost"
        size="sm"
        :label="__('Trail')"
        :iconLeft="LucideHistory"
        :aria-label="__('{0} approval trail', [__(row.kind)])"
        @click="openTrail(row.latest.name)"
      />
    </div>
    <Button
      v-if="requestable.length"
      class="sm:ml-auto"
      size="sm"
      :label="__('Request approval')"
      :iconLeft="LucideSend"
      @click="showRequest = true"
    />

    <RequestApprovalDialog
      v-if="requestable.length"
      v-model="showRequest"
      :quotation="quotation"
      :kinds="requestable"
      @requested="$emit('changed')"
    />
    <TrailPanel v-model="showTrail" :name="trailName" />
  </div>
</template>

<script setup>
import LucideHistory from '~icons/lucide/history'
import LucideSend from '~icons/lucide/send'
import AdjustmentChip from './AdjustmentChip.vue'
import RequestApprovalDialog from './RequestApprovalDialog.vue'
import TrailPanel from './TrailPanel.vue'
import { adjustmentChip, canRequest } from './status'
import { Button } from 'frappe-ui'
import { computed, ref } from 'vue'

const props = defineProps({
  quotation: { type: String, required: true },
  // this quotation's entry from get_quotations_adjustment_status
  status: { type: Object, default: null },
  // get_adjustment_limits
  access: { type: Object, default: null },
})
defineEmits(['changed'])

const showRequest = ref(false)
const showTrail = ref(false)
const trailName = ref('')

const rows = computed(() =>
  (props.status?.kinds || []).map((row) => ({
    ...row,
    chip: adjustmentChip(row),
  })),
)
const requestable = computed(() =>
  (props.status?.kinds || []).filter((row) =>
    canRequest(row, props.status.docstatus, props.access),
  ),
)

function openTrail(name) {
  trailName.value = name
  showTrail.value = true
}
</script>
