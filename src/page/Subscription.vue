<template>
  <div class="h-full flex flex-col p-4 space-y-4">
    <div class="flex-1 min-h-0 overflow-y-auto">
      <!-- Subscription Input -->
      <div class="flex flex-col space-y-2">
        <div class="flex items-center">
          <input
            type="text"
            v-model="clientId"
            @keydown.enter="handleSubscription"
            placeholder="Enter Client ID"
            :disabled="isFetching"
            class="flex-grow py-2 px-3 border rounded-l-md focus:outline-none focus:ring focus:ring-blue-500"
          />

          <button
            @click="handleSubscription"
            :disabled="isFetching || !clientId"
            class="py-2 px-4 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-500"
          >
            <i class="mdi mdi-sync"></i>
            {{ subscriptionButtonText }}
          </button>
        </div>

        <Message
          v-if="hasError"
          type="error"
          :message="subscriptionStore.subscriptionError"
        />
      </div>

      <!-- Subscription Details -->
      <div
        v-if="preferencesStore.leafPreferences.last_update_time"
        class="bg-white shadow-md rounded-lg p-6 mt-4"
      >
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-800">
            Subscription Details
          </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Last Updated -->
          <InfoCard
            icon="mdi mdi-clock-outline"
            title="Last Updated"
            :value="preferencesStore.lastUpdatedTime"
          />

          <!-- Remaining Traffic -->
          <InfoCard
            icon="mdi mdi-database"
            title="Remaining Traffic"
            :value="preferencesStore.remainingTraffic"
            :valueClass="preferencesStore.remainingTrafficColor"
          />

          <!-- Expiration -->
          <InfoCard
            icon="mdi mdi-calendar"
            title="Expiration"
            :value="preferencesStore.leafPreferences.expire_time || 'Unknown'"
            :valueClass="preferencesStore.expireTimeColor"
          />
        </div>
      </div>

      <!-- Missing Client ID Info -->
      <div
        v-else
        class="bg-blue-50 border border-blue-100 rounded-lg p-6 mt-4 text-center"
      >
        <i class="mdi mdi-information text-3xl text-blue-500 mb-2"></i>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          No Subscription Found
        </h3>
        <p class="text-sm text-gray-600 mb-4 max-w-sm mx-auto leading-relaxed">
          Please provide a valid Client ID above. Don't have a provider? Get a
          secure Client ID instantly via our official Lite VPN Telegram Bot.
        </p>
        <button
          @click="openTelegramBot"
          class="inline-flex items-center px-5 py-2.5 bg-[#0088cc] text-white text-sm font-medium rounded-md hover:bg-[#0077b3] transition-colors shadow-sm"
        >
          <i class="mdi mdi-telegram mr-2 text-lg"></i> Open Telegram Bot
        </button>
      </div>
    </div>
    <div class="flex-shrink-0 mt-4 border-t pt-4">
      <div class="flex space-x-2">
        <button
          @click="importFromClipboard"
          :disabled="isFetching"
          class="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <i class="mdi mdi-clipboard-text mr-2"></i>
          Import from Clipboard
        </button>

        <button
          @click="openOfflineDialog"
          :disabled="isFetching"
          class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
        >
          <i class="mdi mdi-upload mr-2"></i>
          Offline Import
        </button>
      </div>
    </div>

    <!-- Offline Import Dialog -->
    <div
      v-if="isOfflineDialogOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="closeOfflineDialog"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
        @click.stop
      >
        <div
          class="px-6 py-4 border-b border-gray-200 flex items-center justify-between"
        >
          <h3 class="text-lg font-semibold text-gray-900">Offline Import</h3>
          <button
            @click="closeOfflineDialog"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>

        <div class="px-6 py-5 space-y-4">
          <div class="space-y-2">
            <label class="text-sm text-gray-700"
              >Subscription file (.leafsub)</label
            >
            <div class="flex gap-2">
              <input
                type="text"
                v-model="offlinePath"
                placeholder="Select .leafsub file"
                :disabled="isFetching"
                class="flex-grow py-2 px-3 border rounded-md focus:outline-none focus:ring focus:ring-blue-500"
                readonly
              />
              <button
                @click="pickOfflineFile"
                :disabled="isFetching"
                class="py-2 px-3 bg-gray-100 border rounded-md hover:bg-gray-200 focus:outline-none focus:ring focus:ring-blue-500"
              >
                Browse
              </button>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-sm text-gray-700">Passphrase (optional)</label>
            <input
              type="password"
              v-model="passphrase"
              placeholder="Leave empty if no passphrase is required"
              :disabled="isFetching"
              class="w-full py-2 px-3 border rounded-md focus:outline-none focus:ring focus:ring-blue-500"
            />
          </div>

          <Message
            v-if="hasError"
            type="error"
            :message="subscriptionStore.subscriptionError"
          />
        </div>

        <div
          class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-lg"
        >
          <button
            @click="closeOfflineDialog"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="importOffline"
            :disabled="isFetching || !offlinePath"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-500 disabled:opacity-60"
          >
            <i
              :class="[
                'mdi',
                isFetching ? 'mdi-loading mdi-spin' : 'mdi-upload',
              ]"
            ></i>
            <span>{{ isFetching ? 'Updating...' : 'Import Offline' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useSubscriptionStore } from '../store/subscription';
import { usePreferencesStore } from '../store/preferences';
import Message from '../components/Message.vue';
import InfoCard from '../components/InfoCard.vue';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { Utils } from '../utils/Utils.ts';
import { error } from '../utils/logger';
import { open } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';

export default {
  name: 'SubscriptionComponent',
  components: { Message, InfoCard },
  setup() {
    const clientId = ref('');
    const subscriptionStore = useSubscriptionStore();
    const preferencesStore = usePreferencesStore();
    const offlinePath = ref('');
    const isOfflineDialogOpen = ref(false);
    const passphrase = ref('');
    const defaultKeyring = {
      k1: 'FjBD6zMrxVtHpWqzqsuFmT8uB7RZKmMuO94nT0N5LKo',
    };

    const isFetching = computed(
      () => subscriptionStore.subscriptionState === 'Fetching'
    );
    const hasError = computed(
      () => subscriptionStore.subscriptionState === 'Error'
    );
    const subscriptionButtonText = computed(() =>
      isFetching.value ? 'Updating...' : 'Update'
    );

    const handleSubscription = () => {
      if (clientId.value) {
        subscriptionStore.updateSubscription(clientId.value);
      }
    };

    const openOfflineDialog = () => {
      subscriptionStore.subscriptionError = '';
      isOfflineDialogOpen.value = true;
    };

    const closeOfflineDialog = () => {
      if (isFetching.value) return;
      isOfflineDialogOpen.value = false;
      offlinePath.value = '';
      passphrase.value = '';
    };

    const pickOfflineFile = async () => {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'Leaf subscription', extensions: ['leafsub'] }],
      });

      if (typeof selected === 'string') {
        offlinePath.value = selected;
      }
    };

    const importOffline = async () => {
      if (!offlinePath.value) {
        await message('Please select a .leafsub file.', {
          title: 'Missing file',
          kind: 'warning',
        });
        return;
      }

      await subscriptionStore.importOfflineSubscription({
        path: offlinePath.value,
        passphrase: passphrase.value || null,
        keyringJson: JSON.stringify(defaultKeyring),
      });
    };

    watch(
      () => subscriptionStore.subscriptionState,
      async (state) => {
        if (state === 'Success') {
          await preferencesStore.fetchLeafPreferences();

          if (preferencesStore.leafPreferences.client_id) {
            clientId.value = preferencesStore.leafPreferences.client_id;
          }

          if (isOfflineDialogOpen.value) {
            closeOfflineDialog();
          }
        }
      }
    );

    watch(
      () => subscriptionStore.offlineImportPath,
      async (path) => {
        console.log('offline import path changed to', path);
        if (!path) return;

        offlinePath.value = path;
        passphrase.value = '';
        openOfflineDialog();
        subscriptionStore.offlineImportPath = '';
      }
    );

    const openTelegramBot = async () => {
      await openUrl('https://t.me/offical_lite_vpn_bot');
    };

    const importFromClipboard = async () => {
      try {
        const content = await readText();

        if (content && Utils.isValidUUIDv4(content)) {
          const result = await ask(
            'Found a client ID in clipboard. Would you like to use it?',
            {
              title: 'Import Client ID',
              kind: 'info',
              okLabel: 'Yes',
              cancelLabel: 'No',
            }
          );

          if (result) {
            clientId.value = content;
            await subscriptionStore.updateSubscription(content);
          }
        } else {
          await message(
            'Clipboard does not contain a valid client ID (UUIDv4).',
            {
              title: 'Invalid Clipboard',
              kind: 'info',
            }
          );
        }
      } catch (e) {
        error('Error reading clipboard:', e);
        await message('Error reading clipboard.', {
          title: 'Clipboard Error',
          kind: 'error',
        });
      }
    };

    onMounted(async () => {
      await preferencesStore.fetchLeafPreferences();
      if (preferencesStore.leafPreferences.client_id) {
        clientId.value = preferencesStore.leafPreferences.client_id;
      }
    });

    return {
      clientId,
      isFetching,
      hasError,
      subscriptionButtonText,
      handleSubscription,
      importFromClipboard,
      importOffline,
      pickOfflineFile,
      offlinePath,
      isOfflineDialogOpen,
      passphrase,
      openOfflineDialog,
      closeOfflineDialog,
      preferencesStore,
      subscriptionStore,
      openTelegramBot,
    };
  },
};
</script>

<style scoped></style>
