<template>
  <div class="bg-gray-50 rounded-lg p-4 shadow-sm">
    <div class="flex items-center mb-2">
      <i :class="[icon, 'text-gray-500 text-xl mr-3']"></i>
      <h4 class="text-sm font-medium text-gray-600">{{ title }}</h4>
    </div>
    <div>
      <span :class="['text-base font-medium', valueClass]">{{ value }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'InfoCard',
  props: {
    icon: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    value: {
      type: [String, Number],
      required: true,
    },
    valueClass: {
      type: String,
      default: 'text-gray-800',
    },
  },
});
</script>

<style scoped></style>
