<template>
  <div v-if="outboundsStore.outboundState === 'Success'" class="space-y-2">
    <h2 class="text-lg font-semibold mb-4">Outbounds</h2>
    <ul class="list-none p-0 space-y-2">
      <li
        v-for="outbound in outboundsStore.outbounds"
        :key="outbound.name"
        @click="outboundsStore.changeSelectedOutbound(outbound.name)"
        :class="[
          'p-2 shadow-md rounded-md cursor-pointer',
          outbound.is_selected
            ? 'bg-gray-900 text-white'
            : 'bg-white text-gray-900',
        ]"
      >
        <div
          class="flex items-center"
          v-html="getCountryInfo(outbound.name)"
        ></div>
      </li>
    </ul>
  </div>

  <Message v-else-if="outboundsStore.outboundState === 'Error'" type="error">
    <div class="flex items-center">
      <span>Error loading outbounds</span>
      <button
        @click="outboundsStore.getOutbounds()"
        class="ml-2 px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        <i class="mdi mdi-refresh"></i>
        Retry
      </button>
    </div>
  </Message>

  <Message
    v-else-if="
      outboundsStore.outboundState === 'Initial' &&
      preferencesStore.leafPreferences.last_update_time
    "
    type="info"
    message="Start to see outbounds"
  />

  <!-- Loading state indicator -->
  <div
    v-else-if="outboundsStore.outboundState === 'Loading'"
    class="h-full flex items-center justify-center"
  >
    <div
      class="w-12 h-12 border-4 border-t-4 border-blue-500 rounded-full animate-spin"
    ></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useOutboundsStore } from '../store/outbounds.ts';
import { usePreferencesStore } from '../store/preferences.ts';
import { getName, registerLocale } from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import Message from './Message.vue';

export default defineComponent({
  name: 'OutboundsComponent',
  components: { Message },
  setup() {
    const outboundsStore = useOutboundsStore();
    const preferencesStore = usePreferencesStore();

    registerLocale(en);

    const getCountryInfo = (isoCode: string) => {
      if (isoCode === 'AUTO') {
        return '<span class="emoji">🌐</span> Auto';
      }

      const getCountryEmoji = (countryCode: string) => {
        const offset = 127397;
        return String.fromCodePoint(
          ...countryCode
            .toUpperCase()
            .split('')
            .map((char: string) => char.charCodeAt(0) + offset)
        );
      };

      if (isoCode.length === 2) {
        const emoji = getCountryEmoji(isoCode);
        const countryName = getName(isoCode, 'en');
        return `<span class="emoji">${emoji}</span>&nbsp;${countryName}`;
      }

      return isoCode;
    };

    return {
      getCountryInfo,
      outboundsStore,
      preferencesStore,
    };
  },
});
</script>

<style scoped></style>
