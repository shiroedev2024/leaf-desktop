<template>
  <div class="h-full flex flex-col p-4 space-y-4">
    <!-- Messages Section -->
    <Message
      v-if="showNotification"
      type="info"
      class="mb-4 cursor-pointer hover:shadow-md transition-shadow rounded-md px-4 py-3 w-full"
      @click="openUpdateDialog"
    >
      <div class="w-full flex items-center justify-between space-x-4">
        <div class="flex items-center space-x-3">
          <div class="text-sm text-blue-800">
            <span class="font-medium">A new version is available:</span>
            <span class="font-semibold ml-1">{{
              updateStore.updateInfo?.version
            }}</span>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
            @click.stop="handleUpdateAction"
            class="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            {{ updateStore.isLinuxUpdate ? 'Download' : 'Update' }}
          </button>

          <button
            @click.stop="dismissNotification"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="dismiss update notification"
          >
            <i class="mdi mdi-close"></i>
          </button>
        </div>
      </div>
    </Message>

    <UpdateDialog :is-open="isUpdateDialogOpen" @close="closeUpdateDialog" />

    <!-- Error/Warning Messages -->
    <Message
      v-if="leafStore.leafState === 'Error'"
      type="error"
      :message="leafStore.leafError"
    />

    <Message
      v-if="leafStore.coreState === 'Error'"
      type="error"
      :message="leafStore.coreError"
    />

    <Message
      v-if="preferencesStore.isExpired"
      type="warning"
      message="Your subscription has expired."
    />

    <Message
      v-if="preferencesStore.isTrafficReached"
      type="warning"
      message="Your traffic limit has been reached."
    />

    <!-- Empty State / Ad Banner -->
    <div
      v-if="!preferencesStore.leafPreferences.last_update_time"
      class="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white rounded-lg shadow-sm border border-gray-100"
    >
      <div
        class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4"
      >
        <i class="mdi mdi-rocket-launch-outline text-3xl text-blue-500"></i>
      </div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">Welcome to Lite VPN</h2>
      <p class="text-gray-600 mb-6 max-w-md leading-relaxed">
        Begin by adding a Client ID to start using the service. If you don't
        have a provider yet, you can obtain one instantly through our official
        Telegram bot.
      </p>
      <div class="flex flex-col sm:flex-row gap-3">
        <router-link
          to="/subscription"
          class="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <i class="mdi mdi-key-variant mr-2"></i>Add Client ID
        </router-link>
        <button
          @click="openTelegramBot"
          class="px-5 py-2.5 bg-[#0088cc] text-white font-medium rounded-lg hover:bg-[#0077b3] transition-colors shadow-sm"
        >
          <i class="mdi mdi-telegram mr-2"></i>Get a Provider
        </button>
      </div>
    </div>

    <!-- Middle Section (Scrollable) -->
    <div
      v-if="preferencesStore.leafPreferences.last_update_time"
      class="flex-1 overflow-x-hidden overflow-y-auto"
    >
      <Outbounds />
    </div>

    <!-- Bottom Section (Fixed) -->
    <div
      v-if="preferencesStore.leafPreferences.last_update_time"
      class="flex-shrink-0 mt-4 border-t pt-4"
    >
      <div class="flex space-x-2">
        <!-- Cancel Button - Only show during core loading -->
        <button
          v-if="leafStore.coreState === 'Loading' && !leafStore.isCancelling"
          @click="leafStore.cancelCoreStart()"
          class="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <i class="mdi mdi-cancel mr-2"></i>
          Cancel
        </button>

        <!-- Main Start/Stop Button -->
        <button
          @click="leafStore.toggleLeaf()"
          :disabled="isButtonDisabled"
          :class="[
            'flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ease-in-out',
            buttonClassState,
          ]"
        >
          <i :class="['mr-2', leafStore.leafButtonIcon]"></i>
          {{ leafStore.leafButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { usePreferencesStore } from '../store/preferences.ts';
import { useLeafStore } from '../store/leaf.ts';
import { useSubscriptionStore } from '../store/subscription.ts';
import { useOutboundsStore } from '../store/outbounds.ts';
import { LeafState } from '../types/types.ts';
import Outbounds from '../components/Outbounds.vue';
import Message from '../components/Message.vue';
import UpdateDialog from '../components/UpdateDialog.vue';
import { useUpdateStore } from '../store/update.ts';
import { onMounted, ref, computed, watch, onUnmounted } from 'vue';
import { error } from '../utils/logger';
import { openUrl } from '@tauri-apps/plugin-opener';

export default {
  name: 'DashboardComponent',
  components: { Message, Outbounds, UpdateDialog },
  setup() {
    const preferencesStore = usePreferencesStore();
    const leafStore = useLeafStore();
    const subscriptionStore = useSubscriptionStore();
    const outboundsStore = useOutboundsStore();
    const updateStore = useUpdateStore();
    const pingTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

    onMounted(async () => {
      await preferencesStore.fetchLeafPreferences();
      // initialize and check for updates from Dashboard
      try {
        await updateStore.init();
        await updateStore.checkForUpdates();
      } catch (e) {
        error('Error initializing update store:', e);
      }
    });

    // Watch leaf state changes to auto-ping when started
    watch(
      () => leafStore.leafState,
      async (newValue, oldValue) => {
        if (newValue === LeafState.Started && oldValue !== LeafState.Started) {
          // Clear any existing timeout
          if (pingTimeout.value) {
            clearTimeout(pingTimeout.value);
          }

          // Schedule new timeout and store reference
          pingTimeout.value = setTimeout(async () => {
            if (outboundsStore.outbounds.length > 0) {
              await outboundsStore.refreshPings();
            }
          }, 3000); // 3 second delay
        }
      }
    );

    // Cleanup timeout on component unmount
    onUnmounted(() => {
      if (pingTimeout.value) {
        clearTimeout(pingTimeout.value);
        pingTimeout.value = null;
      }
    });

    const isUpdateDialogOpen = computed({
      get: () => updateStore.isUpdateDialogOpen,
      set: (value: boolean) => {
        if (!value) updateStore.closeUpdateDialog();
      },
    });

    const dismissedVersion = ref<string | null>(null);

    const showNotification = computed(() => {
      return (
        updateStore.isUpdateAvailable &&
        !updateStore.isUpdateDialogOpen &&
        updateStore.updateInfo?.version !== dismissedVersion.value
      );
    });

    // Modernized UX conditions
    const isLoading = computed(() => {
      return (
        leafStore.leafState === 'Loading' ||
        leafStore.leafState === 'Reloaded' ||
        (leafStore.coreState === 'Loading' && !leafStore.isCancelling)
      );
    });

    const isButtonDisabled = computed(() => {
      return (
        isLoading.value ||
        preferencesStore.leafPreferences.last_update_time === undefined
      );
    });

    const buttonClassState = computed(() => {
      if (leafStore.leafState === 'Started') {
        return 'bg-red-500 hover:bg-red-600 focus:ring-red-500';
      }
      if (isLoading.value) {
        return 'bg-blue-400 cursor-wait animate-pulse';
      }
      return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500';
    });

    const openUpdateDialog = () => updateStore.openUpdateDialog();
    const closeUpdateDialog = () => updateStore.closeUpdateDialog();

    const handleUpdateAction = async () => {
      if (!updateStore.updateInfo) return;
      if (updateStore.isLinuxUpdate) {
        await updateStore.installUpdate();
      } else {
        updateStore.openUpdateDialog();
      }
    };

    const dismissNotification = () => {
      if (updateStore.updateInfo?.version) {
        dismissedVersion.value = updateStore.updateInfo.version;
      }
    };

    const openTelegramBot = async () => {
      await openUrl('https://t.me/offical_lite_vpn_bot');
    };

    return {
      preferencesStore,
      leafStore,
      subscriptionStore,
      outboundsStore,
      updateStore,
      isUpdateDialogOpen,
      showNotification,
      isButtonDisabled,
      buttonClassState,
      openUpdateDialog,
      closeUpdateDialog,
      handleUpdateAction,
      dismissNotification,
      openTelegramBot,
    };
  },
};
</script>

<style scoped></style>
