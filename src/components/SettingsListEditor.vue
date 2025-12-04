<template>
  <div>
    <label class="block">
      <span class="font-medium">{{ label }}</span>
      <p class="text-sm text-gray-500 mb-1">{{ description }}</p>
      <div
        class="mt-1 flex flex-wrap items-center gap-2 rounded-md border border-gray-300 p-2"
      >
        <template v-for="(item, index) in modelValue || []" :key="index">
          <span
            class="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm"
          >
            <span class="mr-2">{{ item }}</span>
            <button
              @click.prevent="removeItem(index)"
              class="text-gray-400 hover:text-gray-700 focus:outline-none"
              aria-label="Remove item"
            >
              <i class="mdi mdi-close text-sm"></i>
            </button>
          </span>
        </template>

        <input
          v-model="inputValue"
          @keydown="onKeydown"
          @blur="onBlur"
          :placeholder="placeholder"
          class="flex-1 min-w-[160px] outline-none bg-transparent"
        />
      </div>
    </label>
  </div>
</template>

<script lang="ts">
import { ref, watch } from 'vue';

export default {
  name: 'SettingsListEditor',
  props: {
    modelValue: { type: Array as () => string[] | undefined, required: true },
    label: { type: String, required: true },
    description: { type: String, required: true },
    placeholder: { type: String, default: 'Add item and press Enter' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const inputValue = ref('');

    const addItemsFromString = (value: string) => {
      const parts = value
        .split(/[,\n]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parts.length === 0) return;
      const current = Array.isArray(props.modelValue)
        ? [...props.modelValue]
        : [];
      let changed = false;
      parts.forEach((p) => {
        if (current.indexOf(p) === -1) {
          current.push(p);
          changed = true;
        }
      });
      if (changed) {
        emit('update:modelValue', current);
      }
    };

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (inputValue.value.trim().length > 0) {
          addItemsFromString(inputValue.value);
          inputValue.value = '';
        }
      }
    };

    const onBlur = () => {
      if (inputValue.value.trim().length > 0) {
        addItemsFromString(inputValue.value);
        inputValue.value = '';
      }
    };

    const removeItem = (index: number) => {
      const current = Array.isArray(props.modelValue)
        ? [...props.modelValue]
        : [];
      current.splice(index, 1);
      emit('update:modelValue', current);
    };

    watch(
      () => props.modelValue,
      (v) => {
        if (!Array.isArray(v)) {
          emit('update:modelValue', []);
        }
      }
    );

    return {
      inputValue,
      onKeydown,
      onBlur,
      removeItem,
    };
  },
};
</script>

<style scoped></style>
