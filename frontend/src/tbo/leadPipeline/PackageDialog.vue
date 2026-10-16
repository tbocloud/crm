<template>
  <Dialog
    v-model:open="open"
    :title="pkg ? __('Edit package') : __('New package')"
    size="3xl"
  >
    <template #default>
      <form
        :id="formId"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="save"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormControl
            v-model="form.package_name"
            :label="__('Package')"
            required
          />
          <FormControl
            v-model="form.item_group"
            type="select"
            :label="__('Category')"
            :options="groupOptions"
          />
          <FormControl
            v-model="form.project_duration"
            :label="__('Project duration')"
            :placeholder="__('For example: 6 weeks')"
          />
          <FormControl
            v-model="form.validity_days"
            type="number"
            min="0"
            :label="__('Validity (days)')"
            :description="__('Blank: the default above.')"
          />
          <FormControl
            v-model="form.description"
            class="sm:col-span-2"
            type="textarea"
            :rows="2"
            :label="__('Description')"
          />
        </div>
        <Checkbox
          v-model="form.enabled"
          :label="__('Offered in the quotation builder')"
        />

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-2 text-base font-medium text-ink-gray-9">
            {{ __('Default lines') }}
          </legend>
          <div
            v-for="(row, i) in form.items"
            :key="row.key"
            class="relative grid grid-cols-2 gap-2 rounded border border-outline-gray-2 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_8rem_2rem] sm:items-start sm:border-0 sm:p-0"
          >
            <FormControl
              v-model="row.item_code"
              class="col-span-2 pr-9 sm:col-span-1 sm:pr-0"
              type="select"
              :options="serviceOptions"
              :aria-label="__('Service, row {0}', [i + 1])"
            />
            <FormControl
              v-model="row.description"
              class="col-span-2 sm:col-span-1"
              :placeholder="__('Description')"
              :aria-label="__('Description, row {0}', [i + 1])"
            />
            <NumberField
              v-model="row.qty"
              :label="__('Qty')"
              min="0"
              step="any"
            />
            <NumberField
              v-model="row.rate"
              :label="__('Rate (0: price list)')"
              min="0"
              step="0.01"
            />
            <div class="absolute right-2 top-2 sm:static">
              <Button
                variant="ghost"
                :icon="LucideTrash2"
                :aria-label="__('Remove row {0}', [i + 1])"
                @click="form.items.splice(i, 1)"
              />
            </div>
          </div>
          <div>
            <Button
              :label="__('Add line')"
              :iconLeft="LucidePlus"
              @click="addLine"
            />
          </div>
        </fieldset>
        <p
          v-if="error"
          role="alert"
          class="whitespace-pre-line text-p-sm text-danger"
        >
          {{ error }}
        </p>
      </form>
    </template>
    <template #actions>
      <div class="flex justify-end gap-2">
        <Button :label="__('Cancel')" @click="open = false" />
        <Button
          variant="solid"
          type="submit"
          :form="formId"
          :label="__('Save')"
          :loading="saving"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import NumberField from '@/tbo/finance/NumberField.vue'
import { Button, Checkbox, Dialog, FormControl, toast } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import LucidePlus from '~icons/lucide/plus'
import LucideTrash2 from '~icons/lucide/trash-2'
import { errorMessage, savePackage } from './api'

const props = defineProps({
  // the package to edit (from get_catalogue); null for a new one
  package: { type: Object, default: null },
  services: { type: Array, default: () => [] },
})
const emit = defineEmits(['saved'])
const open = defineModel({ type: Boolean })
const formId = `tbo-package-${Math.random().toString(36).slice(2, 8)}`
const pkg = computed(() => props.package)
const form = ref({ items: [] })
const saving = ref(false)
const error = ref('')
let rowKey = 0

const serviceOptions = computed(() => [
  { label: __('Choose a service'), value: '' },
  ...props.services.map((row) => ({
    label: row.item_name,
    value: row.item_code,
  })),
])
const groupOptions = computed(() => [
  { label: __('None'), value: '' },
  ...[
    ...new Set(props.services.map((row) => row.item_group).filter(Boolean)),
  ].map((name) => ({ label: name, value: name })),
])

watch(open, (isOpen) => {
  if (!isOpen) return
  const p = props.package
  form.value = {
    name: p?.name || '',
    package_name: p?.package_name || '',
    item_group: p?.item_group || '',
    project_duration: p?.project_duration || '',
    validity_days: p?.validity_days || '',
    description: p?.description || '',
    enabled: true,
    items: (p?.items || []).map((row) => ({ ...row, key: ++rowKey })),
  }
  if (!form.value.items.length) addLine()
  error.value = ''
})

function addLine() {
  form.value.items.push({
    key: ++rowKey,
    item_code: '',
    description: '',
    qty: 1,
    rate: 0,
  })
}

async function save() {
  const items = form.value.items.filter((row) => row.item_code)
  if (!form.value.package_name.trim())
    return (error.value = __('Name the package.'))
  if (!items.length) return (error.value = __('Add at least one line.'))
  saving.value = true
  error.value = ''
  try {
    await savePackage({
      ...form.value,
      enabled: form.value.enabled ? 1 : 0,
      items: items.map((row) => ({
        item_code: row.item_code,
        description: row.description || null,
        qty: Number(row.qty) || 1,
        rate: Number(row.rate) || 0,
      })),
    })
    toast.success(__('Package {0} saved', [form.value.package_name]))
    emit('saved')
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
