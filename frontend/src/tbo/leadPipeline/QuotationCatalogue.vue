<template>
  <section class="flex flex-col gap-4" aria-labelledby="tbo-lp-catalogue">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3
          id="tbo-lp-catalogue"
          class="text-base font-semibold text-ink-gray-9"
        >
          {{ __('Quotation catalogue') }}
        </h3>
        <p class="text-p-sm text-ink-gray-6">
          {{
            __(
              'Services are ERPNext sales items; their rate is the {0} price list. Packages fill a quotation with their lines.',
              [data?.price_list || __('selling')],
            )
          }}
        </p>
      </div>
      <Button
        v-if="data?.can_edit"
        :label="__('New package')"
        :iconLeft="LucidePlus"
        @click="editPackage(null)"
      />
    </div>
    <p v-if="data && !data.can_edit" class="text-p-sm text-ink-gray-6">
      {{ __('Only the roles listed above change packages and prices.') }}
    </p>

    <div
      v-if="resource.loading && !data"
      class="flex items-center gap-2 text-ink-gray-6"
    >
      <LoadingIndicator class="size-4" />
      {{ __('Loading...') }}
    </div>
    <p v-else-if="resource.error" role="alert" class="text-p-sm text-danger">
      {{ errorMessage(resource.error) }}
    </p>
    <template v-else-if="data">
      <h4 class="text-sm font-medium text-ink-gray-8">{{ __('Packages') }}</h4>
      <p v-if="!data.packages.length" class="text-p-sm text-ink-gray-6">
        {{ __('No packages yet.') }}
      </p>
      <ul
        v-else
        class="flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-2"
      >
        <li
          v-for="row in data.packages"
          :key="row.name"
          class="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
        >
          <div class="min-w-0">
            <div class="text-base font-medium text-ink-gray-9">
              {{ row.package_name }}
              <span
                v-if="row.enabled === 0"
                class="ml-1 text-xs font-normal text-ink-gray-5"
                >{{ __('Not offered') }}</span
              >
            </div>
            <div class="text-p-sm text-ink-gray-6">
              {{
                [
                  row.item_group,
                  row.project_duration,
                  __('{0} lines', [row.items.length]),
                ]
                  .filter(Boolean)
                  .join(' · ')
              }}
            </div>
          </div>
          <Button
            v-if="data.can_edit"
            size="sm"
            :label="__('Edit')"
            @click="editPackage(row)"
          />
        </li>
      </ul>

      <h4 class="text-sm font-medium text-ink-gray-8">
        {{ __('Service rates') }}
      </h4>
      <div class="overflow-x-auto rounded-lg border border-outline-gray-2">
        <table class="w-full min-w-[28rem] text-p-sm">
          <thead class="text-left text-xs text-ink-gray-6">
            <tr class="border-b border-outline-gray-2">
              <th class="px-3 py-2 font-normal">{{ __('Service') }}</th>
              <th class="px-3 py-2 font-normal">{{ __('Category') }}</th>
              <th class="px-3 py-2 text-right font-normal">{{ __('Rate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in data.services"
              :key="row.item_code"
              class="border-b border-outline-gray-1 last:border-0"
            >
              <td class="px-3 py-2 text-ink-gray-8">{{ row.item_name }}</td>
              <td class="px-3 py-2 text-ink-gray-6">{{ row.item_group }}</td>
              <td class="px-3 py-2 text-right">
                <NumberField
                  v-if="data.can_edit"
                  :model-value="row.rate"
                  class="ml-auto w-32"
                  :label="__('Rate of {0}', [row.item_name])"
                  min="0"
                  step="0.01"
                  @change="(event) => saveRate(row, event.target.value)"
                />
                <span v-else class="font-mono tabular-nums">{{
                  row.rate
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <PackageDialog
      v-if="data"
      v-model="showPackage"
      :package="editing"
      :services="data.services"
      @saved="reload"
    />
  </section>
</template>

<script setup>
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import NumberField from '@/tbo/finance/NumberField.vue'
import { Button, createResource, toast } from 'frappe-ui'
import { computed, ref } from 'vue'
import LucidePlus from '~icons/lucide/plus'
import PackageDialog from './PackageDialog.vue'
import { errorMessage, leadQuotationMethods, load, setServiceRate } from './api'

const resource = createResource({ url: leadQuotationMethods.catalogue })
const reload = () => load(resource)
reload()
const data = computed(() => resource.data)
const showPackage = ref(false)
const editing = ref(null)

function editPackage(row) {
  editing.value = row
  showPackage.value = true
}

async function saveRate(row, value) {
  const rate = Number(value)
  if (!(rate >= 0)) return toast.error(__("A rate can't be negative."))
  try {
    await setServiceRate(row.item_code, rate)
    row.rate = rate
    toast.success(__('{0}: {1}', [row.item_name, rate]))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>
