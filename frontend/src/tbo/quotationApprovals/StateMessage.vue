<template>
  <div
    class="mx-auto flex max-w-sm flex-col items-center gap-3 px-4 py-16 text-center"
    :role="role"
  >
    <component :is="icon" class="size-6 text-ink-gray-5" aria-hidden="true" />
    <div class="flex flex-col gap-1">
      <p class="text-lg font-medium text-ink-gray-8">{{ title }}</p>
      <p
        v-if="description"
        class="whitespace-pre-line text-p-base text-ink-gray-6"
      >
        {{ description }}
      </p>
    </div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  icon: { type: [Object, Function], required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  role: { type: String, default: undefined },
})
</script>
