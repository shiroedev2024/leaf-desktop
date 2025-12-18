<template>
  <div class="h-full flex flex-col p-4 space-y-4">
    <!-- Messages Section -->
    <!-- Inline Update Notification moved from App.vue -->
    <Message
      v-if="showNotification"
      type="info"
      class="mb-4 cursor-pointer hover:shadow-md transition-shadow rounded-md px-4 py-3 w-full"
      @click="openUpdateDialog"
    >
      <div class="w-full flex items-center justify-between space-x-4">
        <div class="flex items-center space-x-3">
          <div class="text-sm text-blue-800">
            <span class="font-medium">A new version</span>
            <span class="font-semibold ml-1">{{
              updateStore.updateInfo?.version
            }}</span>
            <span class="ml-2 text-gray-600">— Click to download.</span>
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

    <!-- Messages Section -->
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
      v-if="
        leafStore.leafState === 'Started' &&
        leafStore.connectivityState === 'Lost'
      "
      type="warning"
      message="No internet — your network connection dropped. VPN can't connect (not a VPN issue). Kill Switch is active: traffic is blocked and your data is protected."
    />

    <Message
      v-if="preferencesStore.isExpired"
      type="warning"
      message="Your subscription has expired!"
    />

    <Message
      v-if="preferencesStore.isTrafficReached"
      type="warning"
      message="Your traffic limit has been reached!"
    />

    <Message
      v-if="!preferencesStore.leafPreferences.last_update_time"
      type="info"
    >
      <div>
        <p class="text-sm">
          Begin by adding a client ID to start using the service.
        </p>
        <router-link to="/subscription" class="text-blue-500 mt-2 inline-block">
          Add Client ID
        </router-link>
      </div>
    </Message>

    <Message v-if="showConnectingDelayMessage" type="info">
      <div class="w-full flex items-center justify-between text-sm">
        <p class="m-0">
          Connecting is taking longer than expected. This may take up to 1
          minute.
        </p>
        <div class="flex-shrink-0">
          <button
            @click.stop="handleForceShutdown"
            class="ml-4 px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
          >
            Force stop core
          </button>
        </div>
      </div>
    </Message>

    <!-- Middle Section (Scrollable) -->
    <div
      v-if="preferencesStore.leafPreferences.last_update_time"
      class="flex-1 overflow-auto"
    >
      <Outbounds />
    </div>

    <!-- Bottom Section (Fixed) -->
    <div
      v-if="preferencesStore.leafPreferences.last_update_time"
      class="flex-shrink-0 mt-4 border-t pt-4"
    >
      <button
        @click="leafStore.toggleLeaf()"
        :disabled="
          leafStore.leafState == 'Loading' ||
          leafStore.leafState === 'Reloaded' ||
          preferencesStore.leafPreferences.last_update_time == undefined
        "
        class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <i :class="['mr-2', leafStore.leafButtonIcon]"></i>
        {{ leafStore.leafButtonText }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { usePreferencesStore } from '../store/preferences.ts';
import { useLeafStore } from '../store/leaf.ts';
import { useSubscriptionStore } from '../store/subscription.ts';
import { useOutboundsStore } from '../store/outbounds.ts';
import Outbounds from '../components/Outbounds.vue';
import Message from '../components/Message.vue';
import UpdateDialog from '../components/UpdateDialog.vue';
import { useUpdateStore } from '../store/update.ts';
import { onMounted, ref, watch, onUnmounted, computed } from 'vue';
import { error } from '../utils/logger';

export default {
  name: 'DashboardComponent',
  components: { Message, Outbounds, UpdateDialog },
  setup() {
    const preferencesStore = usePreferencesStore();
    const leafStore = useLeafStore();
    const subscriptionStore = useSubscriptionStore();
    const outboundsStore = useOutboundsStore();
    const updateStore = useUpdateStore();

    const showConnectingDelayMessage = ref(false);
    let connectingDelayTimer: number | null = null;

    watch(
      () => leafStore.leafState,
      (newState) => {
        // when entering Loading, start a 5s timer to show a message if still loading
        if (newState === 'Loading') {
          showConnectingDelayMessage.value = false;
          if (connectingDelayTimer) {
            clearTimeout(connectingDelayTimer);
          }
          connectingDelayTimer = window.setTimeout(() => {
            if (leafStore.leafState === 'Loading') {
              showConnectingDelayMessage.value = true;
            }
          }, 5000);
        } else {
          // clear any pending timer and hide message when not loading
          if (connectingDelayTimer) {
            clearTimeout(connectingDelayTimer);
            connectingDelayTimer = null;
          }
          showConnectingDelayMessage.value = false;
        }
      },
      { immediate: true }
    );

    onUnmounted(() => {
      if (connectingDelayTimer) {
        clearTimeout(connectingDelayTimer);
        connectingDelayTimer = null;
      }
    });

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

    const handleForceShutdown = async () => {
      try {
        await leafStore.forceShutdownCore();
      } catch (e) {
        error('forceShutdownCore failed', e);
      }
    };

    return {
      preferencesStore,
      leafStore,
      subscriptionStore,
      outboundsStore,
      updateStore,
      showConnectingDelayMessage,
      isUpdateDialogOpen,
      showNotification,
      openUpdateDialog,
      closeUpdateDialog,
      handleUpdateAction,
      dismissNotification,
      handleForceShutdown,
    };
  },
};
</script>

<style scoped></style>
