<template>
  <Dialog v-model:open="open" :title="__('Draft WhatsApp')" size="md">
    <template #default>
      <div class="flex flex-col gap-4">
        <p class="-mt-3 text-p-sm text-ink-gray-6">
          {{ leadName }}
          <span v-if="phone" class="font-mono tabular-nums">· {{ phone }}</span>
        </p>
        <div class="flex items-end gap-2">
          <FormControl
            v-model="language"
            class="flex-1"
            type="select"
            :label="__('Language')"
            :options="[
              { label: __('English'), value: 'en' },
              { label: __('Malayalam'), value: 'ml' },
            ]"
          />
          <Button
            :label="message ? __('Draft again') : __('Draft')"
            :iconLeft="LucideSparkles"
            :loading="drafting"
            @click="draft"
          />
        </div>
        <FormControl
          v-model="message"
          type="textarea"
          :rows="6"
          :label="__('Message')"
          :placeholder="__('Draft one, or write your own.')"
        />
        <p
          v-if="error"
          role="alert"
          class="whitespace-pre-line text-p-sm text-danger"
        >
          {{ error }}
        </p>
      </div>
    </template>
    <template #actions>
      <div class="flex justify-end gap-2">
        <Button :label="__('Cancel')" @click="open = false" />
        <Button
          variant="solid"
          :label="__('Open WhatsApp')"
          :iconLeft="LucideExternalLink"
          :disabled="!link"
          @click="openWhatsApp"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { Button, Dialog, FormControl } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import LucideExternalLink from '~icons/lucide/external-link'
import LucideSparkles from '~icons/lucide/sparkles'
import { draftWhatsapp, errorMessage } from './api'
import { whatsappLink } from './smartLeads'

const props = defineProps({
  lead: { type: String, required: true },
  leadName: { type: String, default: '' },
  phone: { type: String, default: '' },
})
const open = defineModel({ type: Boolean })
const language = ref('en')
const message = ref('')
const drafting = ref(false)
const error = ref('')
const link = computed(() => whatsappLink(props.phone, message.value.trim()))

watch(open, (isOpen) => {
  if (isOpen) {
    message.value = ''
    error.value = ''
  }
})

async function draft() {
  drafting.value = true
  error.value = ''
  try {
    message.value = (await draftWhatsapp(props.lead, language.value)).message
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    drafting.value = false
  }
}

function openWhatsApp() {
  window.open(link.value, '_blank', 'noopener')
  open.value = false
}
</script>
