<template>
  <div>
    <label
      :class="[
        { 'cursor-not-allowed opacity-60': disabled },
        'flex items-center space-x-2',
      ]"
    >
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        @change="
          $emit(
            'update:modelValue',
            ($event.target as HTMLInputElement).checked
          )
        "
        class="form-checkbox h-5 w-5 text-blue-600 rounded"
      />
      <div>
        <span class="font-medium">{{ label }}</span>
        <p class="text-sm text-gray-500">{{ description }}</p>
      </div>
    </label>
  </div>
</template>

<script lang="ts">
export default {
  name: 'SettingsToggle',
  props: {
    modelValue: { type: Boolean, required: true },
    label: { type: String, required: true },
    description: { type: String, required: true },
    disabled: { type: Boolean, required: false, default: false },
  },
  emits: ['update:modelValue'],
};
</script>
