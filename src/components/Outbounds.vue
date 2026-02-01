<template>
  <div v-if="outboundsStore.outboundState === 'Success'" class="space-y-2">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">Outbounds</h2>
      <button
        @click="refreshPings"
        class="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        :disabled="isRefreshingPings"
      >
        <i
          :class="[
            'mdi',
            isRefreshingPings ? 'mdi-loading mdi-spin' : 'mdi-refresh',
          ]"
        ></i>
        Ping
      </button>
    </div>
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
        <div class="flex items-center justify-between">
          <div
            class="flex items-center"
            v-html="getCountryInfo(outbound.name)"
          ></div>
          <div class="flex items-center space-x-2">
            <span
              :class="getPingClass(outbound.ping_ms)"
              class="text-sm font-medium"
            >
              {{ getPingText(outbound.ping_ms) }}
            </span>
          </div>
        </div>
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
import { defineComponent, ref } from 'vue';
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
    const isRefreshingPings = ref(false);

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

    const getPingClass = (pingMs: number | null | undefined) => {
      if (pingMs === null || pingMs === undefined) {
        return 'text-gray-500';
      }
      if (pingMs < 100) return 'text-green-500';
      if (pingMs < 300) return 'text-yellow-500';
      if (pingMs < 800) return 'text-orange-500';
      return 'text-red-500';
    };

    const getPingText = (pingMs: number | null | undefined) => {
      if (pingMs === null || pingMs === undefined) {
        return pingMs === undefined ? 'LOADING' : 'TIMEOUT';
      }
      return `${pingMs}ms`;
    };

    const refreshPings = async () => {
      isRefreshingPings.value = true;

      // Set loading state immediately
      outboundsStore.outbounds.forEach((outbound) => {
        outbound.ping_ms = undefined; // Loading state
      });

      try {
        await outboundsStore.refreshPings();
      } finally {
        isRefreshingPings.value = false;
      }
    };

    return {
      getCountryInfo,
      getPingClass,
      getPingText,
      refreshPings,
      isRefreshingPings,
      outboundsStore,
      preferencesStore,
    };
  },
});
</script>

<style scoped></style>
