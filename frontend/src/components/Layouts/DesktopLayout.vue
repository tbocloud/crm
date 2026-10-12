<template>
  <div class="flex h-screen w-screen">
    <AppSidebar />
    <!-- TBO: Escape in the auto-hide sidebar hands keyboard focus here. -->
    <main
      tabindex="-1"
      class="flex-1 flex flex-col h-full overflow-auto bg-surface-base focus:outline-none"
    >
      <AppHeader />
      <slot />
    </main>
    <GlobalModals />
  </div>
</template>
<script setup>
import AppSidebar from '@/components/Layouts/AppSidebar.vue'
import AppHeader from '@/components/Layouts/AppHeader.vue'
import GlobalModals from '@/components/Modals/GlobalModals.vue'
</script>
