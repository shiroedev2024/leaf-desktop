<template>
  <div>
    <label class="block">
      <span class="font-medium">{{ label }}</span>
      <p class="text-sm text-gray-500 mb-1">{{ description }}</p>
      <input
        :value="modelValue"
        @input="
          $emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
        :type="type"
        :min="min"
        :max="max"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
      />
    </label>
  </div>
</template>

<script lang="ts">
export default {
  name: 'SettingsInput',
  props: {
    modelValue: [String, Number],
    label: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, default: 'text' },
    min: { type: Number, default: null },
    max: { type: Number, default: null },
  },
  emits: ['update:modelValue'],
};
</script>
