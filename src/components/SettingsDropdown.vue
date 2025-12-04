<template>
  <div>
    <label class="block">
      <span class="font-medium">{{ label }}</span>
      <p class="text-sm text-gray-500 mb-1">{{ description }}</p>
      <select
        :value="modelValue"
        @change="
          $emit('update:modelValue', ($event.target as HTMLSelectElement).value)
        "
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
      >
        <option
          v-for="(option, index) in options"
          :key="index"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>
  </div>
</template>

<script lang="ts">
interface Option {
  value: string | number;
  label: string;
}

export default {
  name: 'SettingsDropdown',
  props: {
    modelValue: { type: [String, Number], required: true },
    options: {
      type: Array as () => Option[],
      required: true,
    },
    label: { type: String, required: true },
    description: { type: String, required: true },
  },
  emits: ['update:modelValue'],
};
</script>
