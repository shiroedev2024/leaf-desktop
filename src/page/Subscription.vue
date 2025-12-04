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
      <Message v-else type="info">
        <p class="text-sm">
          Please provide a valid client ID. Check your provider's instructions
          for details on obtaining a client ID.
        </p>
      </Message>
    </div>
    <div class="flex-shrink-0 mt-4 border-t pt-4">
      <button
        @click="importFromClipboard"
        :disabled="isFetching"
        class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-green-500 hover:bg-green-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        <i class="mdi mdi-clipboard-text"></i>
        <span>Import from clipboard</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSubscriptionStore } from '../store/subscription';
import { usePreferencesStore } from '../store/preferences';
import Message from '../components/Message.vue';
import InfoCard from '../components/InfoCard.vue';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { Utils } from '../utils/Utils.ts';

export default {
  name: 'SubscriptionComponent',
  components: { Message, InfoCard },
  setup() {
    const clientId = ref('');
    const subscriptionStore = useSubscriptionStore();
    const preferencesStore = usePreferencesStore();

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
        console.log('Error reading clipboard:', e);
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
      preferencesStore,
      subscriptionStore,
    };
  },
};
</script>

<style scoped></style>
