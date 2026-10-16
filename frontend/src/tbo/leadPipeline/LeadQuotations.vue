<template>
  <div class="flex flex-col gap-4 px-3 pb-6 sm:px-10">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-p-sm text-ink-gray-6">
        <template v-if="data?.deal">
          {{ __('Won: the quotations now belong to deal') }}
          <router-link
            :to="{ name: 'Deal', params: { dealId: data.deal } }"
            class="font-mono text-ink-gray-8 underline-offset-2 hover:underline"
            >{{ data.deal }}</router-link
          >
        </template>
      </p>
      <Button
        v-if="data?.can_write"
        variant="solid"
        :label="__('New quotation')"
        :iconLeft="LucideFilePlus"
        @click="openBuilder('')"
      />
    </div>

    <div
      v-if="resource.loading && !data"
      class="flex items-center gap-2 py-10 text-base text-ink-gray-6"
    >
      <LoadingIndicator class="size-4" />
      {{ __('Loading...') }}
    </div>
    <StateMessage
      v-else-if="resource.error"
      :icon="LucideCircleAlert"
      role="alert"
      :title="__('Quotations could not load')"
      :description="errorMessage(resource.error)"
    >
      <Button :label="__('Try again')" @click="reload" />
    </StateMessage>
    <StateMessage
      v-else-if="data && !families.length"
      :icon="LucideFileText"
      :title="__('No quotations yet')"
      :description="
        __(
          'Build one from a package or services. It stays a draft until you send it.',
        )
      "
    />

    <ol v-else-if="data" class="flex flex-col gap-3">
      <li
        v-for="family in families"
        :key="family[0].name"
        class="rounded-lg border border-outline-gray-2 bg-surface-base"
      >
        <div
          v-for="(row, index) in family.slice(
            0,
            expanded[family[0].name] ? undefined : 1,
          )"
          :key="row.name"
          class="flex flex-col gap-2 p-4"
          :class="
            index ? 'border-t border-outline-gray-1 bg-surface-gray-1' : ''
          "
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex min-w-0 flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-base font-medium text-ink-gray-9">{{
                  row.name
                }}</span>
                <span
                  v-if="row.tbo_revision_no"
                  class="text-xs text-ink-gray-6"
                >
                  {{ __('Revision {0}', [row.tbo_revision_no]) }}
                </span>
                <span
                  v-if="row.tbo_is_latest && family.length > 1"
                  class="rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand-ink"
                  >{{ __('Latest') }}</span
                >
                <StatusChip
                  :label="row.tbo_quote_status || 'Draft'"
                  v-bind="quoteTone(row.tbo_quote_status)"
                />
              </div>
              <p
                class="flex flex-wrap gap-x-3 gap-y-1 text-p-sm text-ink-gray-6"
              >
                <span class="font-mono tabular-nums text-ink-gray-9">{{
                  formatCurrency(row.grand_total, '', row.currency)
                }}</span>
                <span>
                  {{ __('Valid till') }}
                  <span class="font-mono tabular-nums">{{
                    row.valid_till || '–'
                  }}</span>
                </span>
                <span v-if="row.tbo_sent_on">
                  {{
                    __('Sent {0} via {1}', [
                      row.tbo_sent_on.slice(0, 10),
                      __(row.tbo_sent_via),
                    ])
                  }}
                </span>
                <span v-if="row.tbo_package">{{ row.tbo_package }}</span>
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Button
                v-if="actionsFor(row).send"
                size="sm"
                variant="subtle"
                :label="__('Mark sent')"
                :iconLeft="LucideSend"
                @click="openSend(row)"
              />
              <Button
                v-if="actionsFor(row).edit"
                size="sm"
                :label="__('Edit')"
                @click="openBuilder(row.name)"
              />
              <Button
                v-if="actionsFor(row).order"
                size="sm"
                :label="__('Convert to Sales Order')"
                :loading="busy === row.name"
                :disabled="Boolean(busy)"
                @click="toSalesOrder(row)"
              />
              <Dropdown :options="menu(row, family)">
                <Button
                  size="sm"
                  variant="ghost"
                  :aria-label="__('More actions for {0}', [row.name])"
                >
                  <template #icon><LucideEllipsis class="size-4" /></template>
                </Button>
              </Dropdown>
            </div>
          </div>
          <QuotationAdjustments
            v-if="row.docstatus === 0"
            :quotation="row.name"
            :status="adjustments.statusFor(row.name)"
            :access="adjustments.access.value"
            @changed="reload"
          />
        </div>
        <button
          v-if="family.length > 1"
          type="button"
          class="w-full border-t border-outline-gray-1 px-4 py-2 text-left text-p-sm text-ink-gray-6 hover:text-ink-gray-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
          :aria-expanded="Boolean(expanded[family[0].name])"
          @click="expanded[family[0].name] = !expanded[family[0].name]"
        >
          {{
            expanded[family[0].name]
              ? __('Hide earlier revisions')
              : __('{0} earlier revisions', [family.length - 1])
          }}
        </button>
      </li>
    </ol>

    <QuotationDialog
      v-model="showBuilder"
      :lead="lead"
      :quotation="editing"
      @saved="reload"
    />
    <MarkSentDialog
      v-if="sending"
      v-model="showSend"
      :quotation="sending"
      @saved="onMoved"
    />
    <QuoteStatusDialog
      v-if="moving"
      v-model="showMove"
      :quotation="moving.row.name"
      :status="moving.status"
      @saved="onMoved"
    />
    <RevisionsDialog
      v-if="revisionsOf"
      v-model="showRevisions"
      :quotation="revisionsOf"
    />
  </div>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { useDocument } from '@/data/document'
import { formatCurrency } from '@/utils/numberFormat.js'
import QuotationDialog from '@/tbo/finance/QuotationDialog.vue'
import QuotationAdjustments from '@/tbo/quotationApprovals/QuotationAdjustments.vue'
import StateMessage from '@/tbo/quotationApprovals/StateMessage.vue'
import { useQuotationAdjustments } from '@/tbo/quotationApprovals/useQuotationAdjustments'
import { Button, Dropdown, createResource, toast } from 'frappe-ui'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import LucideCircleAlert from '~icons/lucide/circle-alert'
import LucideEllipsis from '~icons/lucide/ellipsis'
import LucideFilePlus from '~icons/lucide/file-plus'
import LucideFileText from '~icons/lucide/file-text'
import LucideSend from '~icons/lucide/send'
import MarkSentDialog from './MarkSentDialog.vue'
import QuoteStatusDialog from './QuoteStatusDialog.vue'
import RevisionsDialog from './RevisionsDialog.vue'
import StatusChip from './StatusChip.vue'
import {
  createRevision,
  errorMessage,
  leadQuotationMethods,
  load,
  makeSalesOrder,
  saveQuotationPdf,
  useLeadPipelineRefresh,
  useLeadQuotationAccess,
} from './api'
import { groupFamilies, printUrls, quoteActions, quoteTone } from './quotes'

const props = defineProps({
  lead: { type: String, required: true },
})

const router = useRouter()
const { access } = useLeadQuotationAccess()
const resource = createResource({
  url: leadQuotationMethods.list,
  cache: ['tbo-lead-quotations', props.lead],
})
const reload = () => load(resource, { lead: props.lead })
reload()
useLeadPipelineRefresh(() => props.lead, reload)

const data = computed(() => resource.data)
const families = computed(() => groupFamilies(data.value?.quotations || []))
const adjustments = useQuotationAdjustments(() =>
  (data.value?.quotations || [])
    .filter((row) => row.docstatus === 0)
    .map((row) => row.name),
)
const expanded = reactive({})
const { document: leadDocument } = useDocument('CRM Lead', props.lead)

const showBuilder = ref(false)
const editing = ref('')
const showSend = ref(false)
const sending = ref('')
const showMove = ref(false)
const moving = ref(null)
const showRevisions = ref(false)
const revisionsOf = ref('')
const busy = ref('')

const actionsFor = (row) =>
  quoteActions(row, {
    canWrite: data.value?.can_write,
    canOrder: access.value?.can_make_orders,
    deal: data.value?.deal,
  })

function openBuilder(name) {
  editing.value = name
  showBuilder.value = true
}

function openSend(row) {
  sending.value = row.name
  showSend.value = true
}

function onMoved() {
  reload()
  leadDocument.reload()
}

// one request at a time (a second Create revision would make two revisions)
async function run(row, action, message) {
  if (busy.value) return
  busy.value = row.name
  try {
    const result = await action()
    if (message) toast.success(message(result))
    reload()
    return result
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = ''
  }
}

async function toSalesOrder(row) {
  const result = await run(
    row,
    () => makeSalesOrder(row.name),
    (r) => __('Draft Sales Order {0} created', [r.sales_order]),
  )
  if (result && data.value?.deal) {
    router.push({
      name: 'Deal',
      params: { dealId: data.value.deal },
      hash: '#finance',
    })
  }
}

function menu(row, family) {
  const actions = actionsFor(row)
  const urls = printUrls(row.name)
  return [
    {
      group: __('Quotation'),
      items: [
        {
          label: __('Preview PDF'),
          onClick: () => window.open(urls.view, '_blank', 'noopener'),
        },
        {
          label: __('Download PDF'),
          onClick: () => window.open(urls.pdf, '_blank', 'noopener'),
        },
        data.value?.can_write && {
          label: __('Save PDF to the lead'),
          onClick: () =>
            run(
              row,
              () => saveQuotationPdf(row.name),
              (r) => __('{0} saved on the lead', [r.file_name]),
            ),
        },
        actions.revise && {
          label: __('Create revision'),
          onClick: () =>
            run(
              row,
              () => createRevision(row.name),
              (r) => __('Revision {0} created as {1}', [r.revision, r.name]),
            ),
        },
        family.length > 1 && {
          label: __('Revision history'),
          onClick: () => {
            revisionsOf.value = row.name
            showRevisions.value = true
          },
        },
      ].filter(Boolean),
    },
    actions.moves.length && {
      group: __('With the client'),
      items: actions.moves.map((status) => ({
        label: __(status),
        onClick: () => {
          moving.value = { row, status }
          showMove.value = true
        },
      })),
    },
  ].filter(Boolean)
}
</script>
