<template>
  <dl
    class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 self-end text-p-sm"
    :aria-label="__('Totals')"
  >
    <dt class="text-ink-gray-6">{{ __('Subtotal') }}</dt>
    <dd class="text-right font-mono tabular-nums text-ink-gray-8">
      {{ money(totals.subtotal) }}
    </dd>
    <template v-if="totals.discount">
      <dt class="text-ink-gray-6">{{ __('Discount') }}</dt>
      <dd class="text-right font-mono tabular-nums text-ink-gray-8">
        −{{ money(totals.discount) }}
      </dd>
    </template>
    <dt class="text-ink-gray-6">
      {{ taxLabel ? __('Tax ({0})', [taxLabel]) : __('Tax') }}
    </dt>
    <dd class="text-right font-mono tabular-nums text-ink-gray-8">
      {{ money(totals.tax) }}
    </dd>
    <dt class="border-t border-outline-gray-2 pt-1 font-medium text-ink-gray-9">
      {{ __('Grand total') }}
    </dt>
    <dd
      class="border-t border-outline-gray-2 pt-1 text-right font-mono text-lg font-semibold tabular-nums text-ink-gray-9"
    >
      {{ money(totals.grand) }}
    </dd>
  </dl>
</template>

<script setup>
// The quotation dialog's live totals (finance.quotationTotals). The tax is the
// template's rate on the net total; the saved quotation's figures are final.
defineProps({
  totals: { type: Object, required: true },
  money: { type: Function, required: true },
  taxLabel: { type: String, default: '' },
})
</script>
