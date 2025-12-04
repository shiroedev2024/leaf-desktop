<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click="closeDialog"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4" @click.stop>
      <!-- Header -->
      <div class="px-8 py-5 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            <i class="mdi mdi-download mr-2"></i>
            Software Update
          </h3>
          <button
            @click="closeDialog"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-8 py-6">
        <!-- Update Info -->
        <div v-if="updateStore.updateInfo" class="mb-4">
          <div class="flex items-center mb-2">
            <span class="text-sm font-medium text-gray-500 mr-2">Version:</span>
            <span class="text-sm font-semibold text-gray-900">{{
              updateStore.updateInfo.version
            }}</span>
            <span
              v-if="updateStore.updateInfo.releaseDate"
              class="text-sm text-gray-500 ml-2"
            >
              • {{ formatDate(updateStore.updateInfo.releaseDate) }}
            </span>
          </div>

          <!-- Expandable release notes section -->
          <div
            v-if="updateStore.updateInfo.notes"
            class="text-sm text-gray-600 mb-4"
          >
            <div class="flex items-center justify-between mb-2">
              <p class="font-medium text-gray-500">Release Notes</p>
              <button
                @click="toggleReleaseNotes"
                class="flex items-center text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
              >
                <span>{{
                  showReleaseNotes ? 'Hide details' : 'Show details'
                }}</span>
                <i
                  :class="[
                    'mdi ml-1 transition-transform duration-300',
                    showReleaseNotes ? 'mdi-chevron-up' : 'mdi-chevron-down',
                  ]"
                ></i>
              </button>
            </div>

            <!-- Expandable content with smooth animation -->
            <transition
              enter-active-class="transition-all duration-300 ease-out"
              leave-active-class="transition-all duration-300 ease-in"
              enter-from-class="max-h-0 overflow-hidden opacity-0"
              enter-to-class="max-h-96 overflow-hidden opacity-100"
              leave-from-class="max-h-96 overflow-hidden opacity-100"
              leave-to-class="max-h-0 overflow-hidden opacity-0"
            >
              <div v-show="showReleaseNotes" class="mt-3">
                <Message
                  :type="'info'"
                  class="rounded-lg border border-blue-200 shadow-sm"
                >
                  <div
                    class="text-sm text-blue-800 whitespace-pre-wrap px-4 py-3 max-h-80 overflow-y-auto custom-scrollbar"
                  >
                    <div
                      v-for="(line, idx) in updateStore.updateInfo.notes.split(
                        '\n'
                      )"
                      :key="idx"
                      class="leading-relaxed"
                    >
                      {{ line }}
                    </div>
                  </div>
                </Message>
              </div>
            </transition>
          </div>
        </div>

        <!-- Progress Bar -->
        <div v-if="updateStore.updateProgress" class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700"
              >Download Progress</span
            >
            <span class="text-sm text-gray-500"
              >{{ updateStore.updateProgress.percentage }}%</span
            >
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              :style="{ width: updateStore.updateProgress.percentage + '%' }"
            ></div>
          </div>
          <div
            class="flex justify-between items-center mt-1 text-xs text-gray-500"
          >
            <span>{{
              formatBytes(updateStore.updateProgress.downloaded)
            }}</span>
            <span>{{ formatBytes(updateStore.updateProgress.total) }}</span>
          </div>
        </div>

        <!-- Status Messages -->
        <Message
          v-if="updateStore.updateMessage"
          :type="updateStore.hasError ? 'error' : 'info'"
          class="mb-4 rounded-lg"
        >
          <div class="text-sm text-blue-800 whitespace-pre-wrap px-4 py-4">
            <!-- show lines from updateMessage (status) instead of repeating updateInfo.notes -->
            <div
              v-for="(line, idx) in (updateStore.updateMessage || '').split(
                '\n'
              )"
              :key="idx"
            >
              {{ line }}
            </div>
          </div>
        </Message>

        <!-- Linux Update Notice -->
        <div
          v-if="updateStore.isLinuxUpdate && updateStore.updateInfo?.url"
          class="mb-4"
        >
          <Message
            :type="'info'"
            class="rounded-lg border border-blue-200 shadow-sm"
          >
            <div class="flex items-start">
              <i
                class="mdi mdi-information-outline text-blue-600 mr-3 mt-0.5"
              ></i>
              <p class="text-sm text-blue-700 leading-relaxed">
                Clicking "Download" will open your browser to download the
                update package. Please install it manually after downloading.
              </p>
            </div>
          </Message>
        </div>

        <!-- VPN Warning -->
        <div v-if="showVPNWarning" class="mb-4">
          <Message type="warning">
            <i class="mdi mdi-alert mr-2"></i>
            Installing this update will temporarily disconnect your VPN
            connection.
          </Message>
        </div>
      </div>

      <!-- Actions -->
      <div class="px-8 py-5 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div class="flex justify-end space-x-3">
          <button
            v-if="
              !updateStore.isDownloading &&
              !updateStore.isInstalling &&
              !updateStore.isDownloaded
            "
            @click="closeDialog"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {{ updateStore.isUpdateAvailable ? 'Later' : 'Close' }}
          </button>

          <button
            v-if="
              updateStore.isUpdateAvailable &&
              updateStore.isLinuxUpdate &&
              !updateStore.isDownloading &&
              !updateStore.isInstalling
            "
            @click="handleDownload"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <i class="mdi mdi-download mr-2"></i>
            Download
          </button>

          <button
            v-if="
              (updateStore.isUpdateAvailable || updateStore.isDownloaded) &&
              updateStore.isTauriUpdate &&
              !updateStore.isDownloading &&
              !updateStore.isInstalling
            "
            @click="handleDownload"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <i class="mdi mdi-download mr-2"></i>
            {{
              updateStore.isDownloaded ? 'Install Now' : 'Download & Install'
            }}
          </button>

          <button
            v-if="updateStore.hasError"
            @click="retryUpdate"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <i class="mdi mdi-refresh mr-2"></i>
            Retry
          </button>

          <!-- Loading states -->
          <button
            v-if="updateStore.isDownloading"
            disabled
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md opacity-75 cursor-not-allowed flex items-center"
          >
            <i class="mdi mdi-loading mdi-spin mr-2"></i>
            Downloading...
          </button>

          <button
            v-if="updateStore.isInstalling"
            disabled
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md opacity-75 cursor-not-allowed flex items-center"
          >
            <i class="mdi mdi-loading mdi-spin mr-2"></i>
            Installing...
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, ref } from 'vue';
import { useUpdateStore } from '../store/update.ts';
import Message from './Message.vue';

export default {
  name: 'UpdateDialogComponent',
  components: {
    Message,
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
  },
  setup(_, { emit }) {
    const updateStore = useUpdateStore();
    const showReleaseNotes = ref(false);

    const showVPNWarning = computed(() => {
      return (
        updateStore.isTauriUpdate &&
        (updateStore.isDownloaded || updateStore.isDownloading)
      );
    });

    const closeDialog = () => {
      updateStore.closeUpdateDialog();
      emit('close');
    };

    const handleDownload = async () => {
      if (updateStore.isLinuxUpdate) {
        await updateStore.installUpdate();
      } else if (updateStore.isTauriUpdate) {
        if (updateStore.isDownloaded) {
          await updateStore.installUpdate();
        } else {
          await updateStore.downloadTauriUpdate();
        }
      }
    };

    const retryUpdate = async () => {
      await updateStore.checkForUpdates();
    };

    const toggleReleaseNotes = () => {
      showReleaseNotes.value = !showReleaseNotes.value;
    };

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
      } catch {
        return 'Unknown date';
      }
    };

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      updateStore,
      showVPNWarning,
      closeDialog,
      handleDownload,
      retryUpdate,
      toggleReleaseNotes,
      showReleaseNotes,
      formatDate,
      formatBytes,
    };
  },
};
</script>

<style scoped>
/* Custom animations for smooth transitions */
.bg-blue-600 {
  transition: width 0.3s ease-out;
}

/* Custom scrollbar styling */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
  transition: background 0.2s ease;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Smooth height transitions for the expandable content */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
