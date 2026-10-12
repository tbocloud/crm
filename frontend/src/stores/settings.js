import { createDocumentResource } from 'frappe-ui'
import { reactive, ref } from 'vue'
import { TBO_BRAND_NAME } from '@/tbo/brand/brand.js'

const settings = ref({})
const brand = reactive({ name: TBO_BRAND_NAME })

const _settings = createDocumentResource({
  doctype: 'FCRM Settings',
  name: 'FCRM Settings',
  onSuccess: (data) => {
    settings.value = data
    getSettings().setupBrand()
    return data
  },
})

export function getSettings() {
  function setupBrand() {
    brand.name = settings.value?.brand_name || TBO_BRAND_NAME
    brand.logo = settings.value?.brand_logo
    brand.favicon = settings.value?.favicon
  }

  return {
    _settings,
    settings,
    brand,
    setupBrand,
  }
}
