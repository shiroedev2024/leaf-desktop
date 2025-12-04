<template>
  <div
    :class="[
      'p-4 rounded-md flex items-center space-x-3',
      type === 'error' && 'bg-red-100 border-l-4 border-red-500 text-red-700',
      type === 'warning' &&
        'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700',
      type === 'info' && 'bg-blue-50 border-l-4 border-blue-500 text-blue-700',
      type === 'success' &&
        'bg-green-50 border-l-4 border-green-500 text-green-700',
    ]"
  >
    <div
      :class="[
        'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
        type === 'error' && 'bg-red-100 text-red-500',
        type === 'warning' && 'bg-yellow-100 text-yellow-500',
        type === 'info' && 'bg-blue-100 text-blue-600',
        type === 'success' && 'bg-green-100 text-green-500',
      ]"
    >
      <i
        :class="[
          'text-xl',
          type === 'error' && 'mdi mdi-alert-circle',
          type === 'warning' && 'mdi mdi-alert',
          type === 'info' && 'mdi mdi-information',
          type === 'success' && 'mdi mdi-check-circle',
        ]"
      ></i>
    </div>
    <div class="flex-1">
      <slot>{{ message }}</slot>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'MessageComponent',
  props: {
    type: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: false,
    },
  },
};
</script>

<style scoped></style>
