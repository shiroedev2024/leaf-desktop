<template>
  <div v-if="outboundsStore.outboundState === 'Success'" class="space-y-2">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-2">
        <button
          v-if="outboundsStore.selectedSubgroupTag"
          @click="outboundsStore.setSubgroup(null)"
          class="p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
          <i class="mdi mdi-arrow-left text-xl"></i>
        </button>
        <h2 class="text-lg font-semibold">{{ currentTitle }}</h2>
      </div>
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
        Ping All
      </button>
    </div>
    <ul class="list-none p-0 px-1 space-y-2">
      <li
        v-for="outbound in outboundsStore.displayOutbounds"
        :key="outbound.name"
        @click="handleOutboundClick(outbound)"
        :class="[
          'p-3 shadow-md rounded-lg cursor-pointer transition-all hover:scale-[1.01]',
          outbound.is_selected
            ? 'bg-gray-900 text-white'
            : 'bg-white text-gray-900 hover:bg-gray-50',
        ]"
      >
        <div class="flex items-center justify-between">
          <div
            class="flex items-center flex-1"
            v-html="getOutboundDisplayHTML(outbound.name)"
          ></div>
          <div class="flex items-center space-x-3">
            <span
              :class="getPingClass(outbound.ping_ms)"
              class="text-sm font-bold tabular-nums"
            >
              {{ getPingText(outbound.ping_ms) }}
            </span>
            <button
              @click.stop="outboundsStore.pingOutbound(outbound.name)"
              class="p-1 hover:bg-gray-400/20 rounded-full transition-colors"
              title="Ping this node"
            >
              <i class="mdi mdi-access-point"></i>
            </button>
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
import { defineComponent, ref, computed } from 'vue';
import { useOutboundsStore } from '../store/outbounds.ts';
import { usePreferencesStore } from '../store/preferences.ts';
import { getName, registerLocale } from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import { OutboundUtils } from '../utils/OutboundUtils';
import { OutboundInfo } from '../api/OutboundInfo.ts';
import Message from './Message.vue';

export default defineComponent({
  name: 'OutboundsComponent',
  components: { Message },
  setup() {
    const outboundsStore = useOutboundsStore();
    const preferencesStore = usePreferencesStore();
    const isRefreshingPings = ref(false);

    registerLocale(en);

    const currentTitle = computed(() => {
      const tag = outboundsStore.selectedSubgroupTag;
      if (!tag) return 'Outbounds';
      if (tag === 'AUTO') return 'Global Auto';

      // If it's a country code (2 chars)
      if (tag.length === 2) {
        return getName(tag, 'en') || tag;
      }

      return tag;
    });

    const getOutboundDisplayHTML = (tag: string) => {
      if (tag === 'AUTO') {
        return '<span class="emoji">🌐</span>&nbsp;<span class="font-medium">Global Auto</span>';
      }

      if (tag.endsWith('_AUTO')) {
        const countryCode = tag.split('_')[0];
        const emoji = OutboundUtils.getCountryEmoji(countryCode);
        return `<span class="emoji">${emoji}</span>&nbsp;<span class="font-medium">${countryCode} Auto</span>`;
      }

      const nodeDetails = OutboundUtils.parseNodeTag(tag);
      if (nodeDetails) {
        const emoji = OutboundUtils.getCountryEmoji(nodeDetails.country);
        return `
          <div class="flex flex-col">
            <div class="flex items-center">
              <span class="emoji">${emoji}</span>&nbsp;
              <span class="font-bold">${nodeDetails.region}</span>
            </div>
            <span class="text-xs opacity-60 ml-[1.6rem]">${nodeDetails.ip}</span>
          </div>
        `;
      }

      if (tag.length === 2) {
        const emoji = OutboundUtils.getCountryEmoji(tag);
        const countryName = getName(tag, 'en');
        return `<span class="emoji">${emoji}</span>&nbsp;<span class="font-medium">${countryName}</span>`;
      }

      return `<span class="font-medium">${tag}</span>`;
    };

    const handleOutboundClick = (outbound: OutboundInfo) => {
      // If it's a country code (e.g., US) and we're in the main view,
      // we select it (set OUT -> US) and then enter its subgroup view.
      if (!outboundsStore.selectedSubgroupTag && outbound.name.length === 2) {
        outboundsStore.changeSelectedOutbound(outbound.name); // Set OUT -> Country
        outboundsStore.setSubgroup(outbound.name); // Enter Subgroup
      } else {
        outboundsStore.changeSelectedOutbound(outbound.name);
      }
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
        return pingMs === undefined ? '...' : 'T/O';
      }
      return `${pingMs}ms`;
    };

    const refreshPings = async () => {
      isRefreshingPings.value = true;
      outboundsStore.outbounds.forEach((outbound) => {
        outbound.ping_ms = undefined;
      });

      try {
        await outboundsStore.refreshPings();
      } finally {
        isRefreshingPings.value = false;
      }
    };

    return {
      currentTitle,
      getOutboundDisplayHTML,
      handleOutboundClick,
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
