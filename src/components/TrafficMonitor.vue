<template>
  <div class="traffic-monitor py-4 px-2 select-none">
    <!-- Speed Counters -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex flex-col items-start min-w-[80px]">
        <div class="flex items-center text-blue-400 mb-0.5">
          <i class="mdi mdi-upload text-sm mr-1"></i>
          <span class="text-[10px] uppercase font-bold tracking-wider"
            >Sent</span
          >
        </div>
        <div class="text-sm font-bold tabular-nums">
          {{ formatSpeed(usageStore.currentSentSpeed) }}
        </div>
      </div>

      <div class="flex flex-col items-end min-w-[80px]">
        <div class="flex items-center text-green-400 mb-0.5">
          <i class="mdi mdi-download text-sm mr-1"></i>
          <span class="text-[10px] uppercase font-bold tracking-wider"
            >Recvd</span
          >
        </div>
        <div class="text-sm font-bold tabular-nums">
          {{ formatSpeed(usageStore.currentRecvdSpeed) }}
        </div>
      </div>
    </div>

    <!-- Mini Chart -->
    <div
      class="relative h-16 w-full mb-4 group overflow-hidden rounded-md bg-gray-900/50"
    >
      <svg
        class="w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <!-- Download Fill (Green) -->
        <path
          :d="chartPath(usageStore.recvdHistory, true)"
          class="fill-green-500/10 transition-all duration-500"
        />
        <!-- Download Line -->
        <path
          :d="chartPath(usageStore.recvdHistory)"
          class="stroke-green-500 fill-none stroke-[1.5] transition-all duration-500"
        />

        <!-- Upload Fill (Blue) -->
        <path
          :d="chartPath(usageStore.sentHistory, true)"
          class="fill-blue-500/10 transition-all duration-500"
        />
        <!-- Upload Line -->
        <path
          :d="chartPath(usageStore.sentHistory)"
          class="stroke-blue-400 fill-none stroke-[1.5] transition-all duration-500"
        />
      </svg>

      <!-- Overlay Gradient for depth -->
      <div
        class="absolute inset-0 bg-gradient-to-t from-gray-900/20 to-transparent pointer-events-none"
      ></div>
    </div>

    <!-- Total Usage Stats -->
    <div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-700/50">
      <div class="flex flex-col">
        <span
          class="text-[9px] text-gray-500 uppercase tracking-widest font-semibold"
          >Total Sent</span
        >
        <span class="text-xs font-medium text-gray-300 tabular-nums">
          {{ formatBytes(usageStore.totalSent) }}
        </span>
      </div>
      <div class="flex flex-col items-end">
        <span
          class="text-[9px] text-gray-500 uppercase tracking-widest font-semibold"
          >Total Recvd</span
        >
        <span class="text-xs font-medium text-gray-300 tabular-nums">
          {{ formatBytes(usageStore.totalRecvd) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useUsageStore } from '../store/usage';
import { Utils } from '../utils/Utils';

export default defineComponent({
  name: 'TrafficMonitor',
  setup() {
    const usageStore = useUsageStore();

    const formatSpeed = (bytesPerSec: number) => {
      if (bytesPerSec === 0) return '0 B/s';
      return `${Utils.formatBytes(bytesPerSec)}/s`;
    };

    const formatBytes = (bytes: number) => {
      return Utils.formatBytes(bytes);
    };

    const chartPath = (history: number[], close = false) => {
      if (history.length < 2) return '';

      const max = Math.max(...history, 1024 * 1024); // Min 1MB/s scale for stability
      const points = history.map((val, i) => {
        const x = (i / (usageStore.maxHistory - 1)) * 100;
        const y = 100 - (val / max) * 100;
        return `${x},${y}`;
      });

      let path = `M ${points[0]}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i]}`;
      }

      if (close) {
        path += ` L 100,100 L 0,100 Z`;
      }

      return path;
    };

    return {
      usageStore,
      formatSpeed,
      formatBytes,
      chartPath,
    };
  },
});
</script>

<style scoped>
.traffic-monitor {
  font-family:
    'Inter',
    ui-sans-serif,
    system-ui,
    -apple-system,
    sans-serif;
}
</style>
