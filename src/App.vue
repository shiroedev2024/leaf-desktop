<template>
  <div class="h-screen overflow-hidden bg-gray-100 flex">
    <!-- Sidebar -->
    <Sidebar />
    <!-- Main Content -->
    <div class="flex-1 flex items-center justify-center" v-if="loading">
      <div
        class="w-12 h-12 border-4 border-t-4 border-blue-500 rounded-full animate-spin"
      ></div>
    </div>
    <div class="flex-1 overflow-auto" v-else>
      <router-view></router-view>
    </div>
  </div>
</template>

<script lang="ts">
import { onMounted, watch, ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { DeepLinkState, LeafState, SubscriptionState } from './types/types.ts';
import { useLeafStore } from './store/leaf.ts';
import { useSubscriptionStore } from './store/subscription.ts';
import { useOutboundsStore } from './store/outbounds.ts';
import { usePreferencesStore } from './store/preferences.ts';
import { useDeeplinkStore } from './store/deeplink.ts';
import Sidebar from './components/Sidebar.vue';
import { Store } from '@tauri-apps/plugin-store';
import delay from 'delay';
import { getDefaultPreferences } from './utils/defaultPreferences';
import { useUpdateStore } from './store/update.ts';
import { info, error, debug } from './utils/logger';
import {
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification';

export default {
  components: {
    Sidebar,
  },
  setup() {
    const leafStore = useLeafStore();
    const subscriptionStore = useSubscriptionStore();
    const outboundsStore = useOutboundsStore();
    const preferencesStore = usePreferencesStore();
    const deeplinkStore = useDeeplinkStore();
    const updateStore = useUpdateStore();
    const router = useRouter();

    const loading = ref(true);

    watch(
      () => leafStore.leafState,
      async (newValue, oldValue) => {
        info('leaf state changed from', oldValue, 'to', newValue);

        if (newValue == LeafState.Started) {
          await outboundsStore.getOutbounds();

          await delay(3000);
          await subscriptionStore.autoUpdateSubscription();
        } else if (newValue == LeafState.Stopped) {
          outboundsStore.resetState();
        }
      }
    );

    watch(
      () => subscriptionStore.subscriptionState,
      async (newValue, oldValue) => {
        info('subscription state changed from', oldValue, 'to', newValue);

        if (newValue === SubscriptionState.Success) {
          await preferencesStore.fetchLeafPreferences();
        }

        if (deeplinkStore.deeplinkState === DeepLinkState.Loading) {
          if (newValue === SubscriptionState.Success) {
            deeplinkStore.deeplinkState = DeepLinkState.Success;
          } else if (newValue === SubscriptionState.Error) {
            deeplinkStore.deeplinkState = DeepLinkState.FetchError;
            deeplinkStore.errorMessage =
              subscriptionStore.subscriptionError ||
              'Failed to install profile';
          }
        }
      }
    );

    watch(
      () => deeplinkStore.deeplinkState,
      async (newValue, oldValue) => {
        info('deeplink state changed from', oldValue, 'to', newValue);

        if (newValue === DeepLinkState.Received) {
          info('navigating to AutoProfile due to deeplink received');
          await router.push('/auto-profile');
        }
      }
    );

    onMounted(async () => {
      // Ask for notification permission once on startup (don't prompt repeatedly)
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const perm = await requestPermission();
          granted = perm === 'granted';
        }

        if (granted) {
          info('Notification permission granted');
        } else {
          debug('Notification permission denied');
        }
      } catch (e) {
        error('Notification permission request failed:', e);
      }

      await deeplinkStore.init();
      await leafStore.init();
      await subscriptionStore.init();

      await preferencesStore.fetchLeafPreferences();
      await subscriptionStore.autoUpdateSubscription();
      await leafStore.getCurrentStatus();

      loading.value = false;

      try {
        await initializeApp();
      } catch (e) {
        error('Error initializing app:', e);
      }
    });

    onUnmounted(async () => {
      await deeplinkStore.dispose();
      await leafStore.dispose();
      await subscriptionStore.dispose();

      updateStore.resetUpdateState();

      info('App component unmounted and stores disposed');
    });

    const initializeApp = async () => {
      const store = await Store.load('app_data.bin');

      const key = 'first_run';
      const firstRun: { value: boolean } = (await store.get(key)) || {
        value: true,
      };

      if (firstRun.value) {
        info('first run detected - setting default preferences');

        const default_preferences = getDefaultPreferences(navigator.userAgent);

        await preferencesStore.updateLeafPreferences(default_preferences);

        await store.set(key, { value: false });
        await store.save();
      } else {
        info('not first run detected');
      }
    };

    return {
      loading,
    };
  },
};
</script>
