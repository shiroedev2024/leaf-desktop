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
        v-if="outboundsStore.selectedSubgroupTag"
        @click="refreshPings"
        class="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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

    <!-- Smooth Transition Group for list items -->
    <transition-group
      name="outbounds-list"
      tag="ul"
      class="list-none p-0 px-1 space-y-2 relative"
    >
      <li
        v-for="outbound in outboundsStore.displayOutbounds"
        :key="outbound.name"
        @click="handleOutboundClick(outbound)"
        :class="[
          'p-3 shadow-sm rounded-lg cursor-pointer transition-all duration-200 border border-transparent',
          outbound.is_selected
            ? 'bg-gray-900 text-white ring-2 ring-gray-900 ring-offset-1'
            : 'bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-200 hover:shadow-md',
        ]"
      >
        <div class="flex items-center justify-between">
          <div
            class="flex items-center flex-1 truncate pr-2"
            v-html="getOutboundDisplayHTML(outbound.name)"
          ></div>

          <!-- Group/Country Indicator Chevron -->
          <div
            v-if="isGroup(outbound.name)"
            class="flex items-center text-gray-400"
          >
            <i class="mdi mdi-chevron-right text-xl"></i>
          </div>

          <!-- Individual Node Ping Stats -->
          <div v-else class="flex items-center space-x-3">
            <span
              :class="getPingClass(outbound.ping_ms)"
              class="text-sm font-bold tabular-nums"
            >
              {{ getPingText(outbound.ping_ms) }}
            </span>
            <button
              @click.stop="outboundsStore.pingOutbound(outbound.name)"
              class="p-1 hover:bg-gray-400/20 rounded-full transition-colors focus:outline-none"
              title="Ping this node"
            >
              <i class="mdi mdi-access-point"></i>
            </button>
          </div>
        </div>
      </li>
    </transition-group>
  </div>

  <Message v-else-if="outboundsStore.outboundState === 'Error'" type="error">
    <div class="flex items-center">
      <span>Error loading outbounds</span>
      <button
        @click="outboundsStore.getOutbounds()"
        class="ml-2 px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
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
    message="Connect to the VPN to view available nodes."
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

    const isGroup = (tag: string) => outboundsStore.isGroupTag(tag);

    const getFlagHtml = (code: string) => {
      return `<img src="/flags/${code.toLowerCase()}.png" class="w-5 h-[15px] object-cover rounded-sm inline-block shadow-sm" alt="${code}" />`;
    };

    const getOutboundDisplayHTML = (tag: string) => {
      if (tag === 'AUTO') {
        return `<i class="mdi mdi-earth text-blue-500 text-xl mr-2"></i><span class="font-medium">Global Auto</span>`;
      }

      if (tag.endsWith('_AUTO')) {
        const countryCode = tag.split('_')[0];
        const flag = getFlagHtml(countryCode);
        return `<span class="flex items-center">${flag}&nbsp;<span class="font-medium ml-1">${countryCode} Auto</span></span>`;
      }

      const nodeDetails = OutboundUtils.parseNodeTag(tag);
      if (nodeDetails) {
        const flag = getFlagHtml(nodeDetails.country);
        return `
          <div class="flex flex-col truncate">
            <div class="flex items-center truncate">
              ${flag}&nbsp;
              <span class="font-bold truncate ml-1">${nodeDetails.region}</span>
            </div>
            <span class="text-xs opacity-60 ml-[1.6rem] truncate">${nodeDetails.ip}</span>
          </div>
        `;
      }

      if (tag.length === 2) {
        const flag = getFlagHtml(tag);
        const countryName = getName(tag, 'en');
        return `<span class="flex items-center">${flag}&nbsp;<span class="font-medium truncate ml-1">${countryName}</span></span>`;
      }

      return `<span class="font-medium truncate">${tag}</span>`;
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
      // Set to undefined to show loading '...' for non-group items before pinging
      outboundsStore.outbounds.forEach((outbound) => {
        if (!isGroup(outbound.name)) {
          outbound.ping_ms = undefined;
        }
      });

      try {
        await outboundsStore.refreshPings();
      } finally {
        isRefreshingPings.value = false;
      }
    };

    return {
      currentTitle,
      isGroup,
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

<style scoped>
.outbounds-list-move,
.outbounds-list-enter-active,
.outbounds-list-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.outbounds-list-enter-from,
.outbounds-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Ensure leave transitions don't block enter transitions */
.outbounds-list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
