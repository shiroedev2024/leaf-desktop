<template>
  <div class="h-full flex flex-col p-6 bg-gray-50">
    <!-- Header -->
    <div class="flex-shrink-0 flex justify-between items-center mb-6">
      <!-- Back Button -->
      <router-link
        to="/settings"
        class="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition"
      >
        <i class="mdi mdi-arrow-left text-2xl mr-2"></i>
        Back
      </router-link>

      <!-- Filters and Action Buttons -->
      <div class="flex items-center space-x-3">
        <!-- Search Input -->
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Search logs..."
          class="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow h-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <!-- Level Filter -->
        <div class="relative" style="min-width: 150px">
          <select
            v-model="selectedLevel"
            class="px-3 pr-8 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow h-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
            <option value="DEBUG">DEBUG</option>
            <option value="TRACE">TRACE</option>
          </select>
          <i
            class="mdi mdi-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
          ></i>
        </div>

        <!-- Action Buttons -->
        <button
          @click="toggleLogs"
          :class="{
            'bg-red-500 hover:bg-red-600': isLogging,
            'bg-green-500 hover:bg-green-600': !isLogging,
          }"
          class="px-4 py-2 text-sm font-medium text-white rounded-lg shadow transition-colors"
        >
          <i :class="['mdi', isLogging ? 'mdi-stop' : 'mdi-play', 'mr-2']"></i>
          {{ isLogging ? 'Stop Logs' : 'Start Logs' }}
        </button>

        <button
          @click="toggleAutoScroll"
          :class="{
            'bg-purple-500 hover:bg-purple-600': autoScrollEnabled,
            'bg-gray-500 hover:bg-gray-600': !autoScrollEnabled,
          }"
          class="px-4 py-2 text-sm font-medium text-white rounded-lg shadow transition-colors"
        >
          <i
            :class="[
              'mdi',
              autoScrollEnabled ? 'mdi-autorenew' : 'mdi-autorenew-off',
              'mr-2',
            ]"
          ></i>
          Auto Scroll
        </button>

        <button
          @click="clearLogs"
          class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-sm font-medium text-white rounded-lg shadow transition-colors"
        >
          <i class="mdi mdi-delete-sweep mr-2"></i>
          Clear
        </button>
      </div>
    </div>

    <!-- Logs Container -->
    <div
      ref="logsContainer"
      class="flex-1 bg-gray-900 text-gray-100 rounded-lg p-4 overflow-y-auto font-mono text-sm shadow-inner"
    >
      <div
        v-for="(log, index) in filteredLogs"
        :key="index"
        :class="getLogClass(log)"
        class="mb-2 leading-relaxed whitespace-pre-wrap"
      >
        {{ log }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { usePreferencesStore } from '../store/preferences';

export default {
  name: 'MemoryLogger',
  setup() {
    const preferencesStore = usePreferencesStore();

    const logs = ref<string[]>([]);
    const isLogging = ref(false);
    const loggingInterval = ref<number | null>(null);
    const logsContainer = ref<HTMLElement | null>(null);
    const autoScrollEnabled = ref(true);
    const searchTerm = ref('');
    const selectedLevel = ref('ERROR');

    // Allowed levels mapping based on selected level
    const allowedLevels = computed(() => {
      const level = selectedLevel.value;
      switch (level) {
        case 'TRACE':
          return ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
        case 'DEBUG':
          return ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        case 'INFO':
          return ['INFO', 'WARN', 'ERROR'];
        case 'WARN':
          return ['WARN', 'ERROR'];
        case 'ERROR':
        default:
          return ['ERROR'];
      }
    });

    // Computed filtered logs
    const filteredLogs = computed(() => {
      const allowed = allowedLevels.value;
      if (!searchTerm.value) {
        return logs.value.filter((log) => allowed.some((l) => log.includes(l)));
      }
      const term = searchTerm.value.toLowerCase();
      return logs.value.filter(
        (log) =>
          log.toLowerCase().includes(term) &&
          allowed.some((l) => log.includes(l))
      );
    });

    // Logging Controls
    const toggleLogs = async () => {
      isLogging.value = !isLogging.value;
      if (isLogging.value) {
        await startLogging();
      } else {
        stopLogging();
      }
    };

    const startLogging = async () => {
      await fetchLogs();
      loggingInterval.value = setInterval(fetchLogs, 1000);
    };

    const stopLogging = () => {
      if (loggingInterval.value) {
        clearInterval(loggingInterval.value);
        loggingInterval.value = null;
      }
    };

    const clearLogs = async () => {
      try {
        await preferencesStore.api.clearLogs();
        logs.value = [];
      } catch (error) {
        console.error('Error clearing logs:', error);
      }
    };

    // Fetch Logs
    const fetchLogs = async () => {
      try {
        const response = await preferencesStore.api.getLogs(
          200,
          logs.value.length
        );
        logs.value.push(...response.messages);
        if (autoScrollEnabled.value) {
          scrollToBottom();
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };

    // Scroll to the Bottom
    const scrollToBottom = () => {
      logsContainer.value?.scrollTo({
        top: logsContainer.value.scrollHeight,
        behavior: 'auto',
      });
    };

    const toggleAutoScroll = () => {
      autoScrollEnabled.value = !autoScrollEnabled.value;
    };

    // Log Styling
    const getLogClass = (log: string) => {
      if (log.includes('ERROR')) return 'text-red-400';
      if (log.includes('WARN')) return 'text-yellow-400';
      if (log.includes('INFO')) return 'text-blue-400';
      if (log.includes('DEBUG')) return 'text-green-400';
      if (log.includes('TRACE')) return 'text-gray-400';
      return 'text-gray-300';
    };

    // Lifecycle Hooks
    onMounted(async () => {
      await preferencesStore.fetchLeafPreferences();
    });

    onBeforeUnmount(() => {
      stopLogging();
    });

    return {
      logs,
      isLogging,
      toggleLogs,
      clearLogs,
      logsContainer,
      getLogClass,
      filteredLogs,
      autoScrollEnabled,
      searchTerm,
      toggleAutoScroll,
      selectedLevel,
    };
  },
};
</script>

<style scoped>
/* Focus and hover styles */
button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>
