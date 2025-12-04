<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex items-center mb-4 text-lg font-medium text-gray-900">
      <i :class="[icon, 'text-xl mr-2']"></i>
      <h2>{{ title }}</h2>
    </div>
    <div class="space-y-4">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'SettingsSection',
  props: {
    title: { type: String, required: true },
    icon: { type: String, default: '' },
  },
};
</script>
