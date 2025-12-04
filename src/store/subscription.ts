import { defineStore } from 'pinia';
import { SubscriptionEvent, SubscriptionState } from '../types/types.ts';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    subscriptionState: 'Initial' as SubscriptionState,
    subscriptionError: '',
    unlistenFn: null as UnlistenFn | null,
  }),

  getters: {
    subscriptionButtonText: (state) => {
      switch (state.subscriptionState) {
        case SubscriptionState.Error:
          return 'Retry';
        case SubscriptionState.Fetching:
          return 'Updating...';
        case SubscriptionState.Initial:
          return 'Update';
        case SubscriptionState.Success:
          return 'Update again';
        default:
          return 'Unknown';
      }
    },
  },

  actions: {
    async init(): Promise<void> {
      this.unlistenFn = await listen<SubscriptionEvent>(
        'subscription-event',
        async (event) => {
          console.log('subscription event', event);

          const subscriptionState = event.payload;

          switch (subscriptionState.type) {
            case 'success':
              this.subscriptionState = SubscriptionState.Success;
              break;
            case 'error':
              this.subscriptionState = SubscriptionState.Error;
              this.subscriptionError = subscriptionState.data.error;
              break;
          }
        }
      );
    },

    async updateSubscription(clientId: string) {
      this.subscriptionState = SubscriptionState.Fetching;

      await invoke('update_subscription', {
        tls: true,
        fragment: true,
        clientId: clientId,
      });
    },

    async autoUpdateSubscription() {
      this.subscriptionState = SubscriptionState.Fetching;

      await invoke('auto_update_subscription', {
        tls: true,
        fragment: true,
      });
    },

    async dispose(): Promise<void> {
      if (this.unlistenFn) {
        this.unlistenFn();
        this.unlistenFn = null;
      }
    },
  },
});
