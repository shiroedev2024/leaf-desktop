import { defineStore } from 'pinia';
import { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { DeepLinkState } from '../types/types.ts';
import { useSubscriptionStore } from './subscription';
import delay from 'delay';

export const useDeeplinkStore = defineStore('deeplink', {
  state: () => ({
    deeplinkState: DeepLinkState.Loading as DeepLinkState,
    loadingMessage: 'Waiting for profile...',
    errorMessage: '',
    currentProfile: null as string | null,
    unlistenFn: null as UnlistenFn | null,
  }),

  actions: {
    async init(): Promise<void> {
      this.unlistenFn = await onOpenUrl(async (urls: string[]) => {
        if (urls && urls.length > 0) {
          try {
            await this.processUrl(urls[0]);
          } catch (err) {
            this.deeplinkState = DeepLinkState.UnknownError;
            this.errorMessage =
              err instanceof Error ? err.message : String(err);
          }
        }
      });

      try {
        const startUrls = await getCurrent();
        if (startUrls && startUrls.length > 0) {
          const url = startUrls[0];
          try {
            await this.processUrl(url);
          } catch (err) {
            this.deeplinkState = DeepLinkState.UnknownError;
            this.errorMessage =
              err instanceof Error ? err.message : String(err);
          }
        }
      } catch {
        console.warn('Failed to get startup deep link via getCurrent()');
      }
    },

    async retryInstall(): Promise<void> {
      if (!this.currentProfile) return;

      this.deeplinkState = DeepLinkState.Loading;
      this.loadingMessage = 'Retrying installation...';

      const subscriptionStore = useSubscriptionStore();
      await subscriptionStore.updateSubscription(this.currentProfile);
    },

    async dispose(): Promise<void> {
      if (this.unlistenFn) {
        this.unlistenFn();
        this.unlistenFn = null;
      }
    },

    async processUrl(url: string): Promise<void> {
      console.log('Processing url:', url);

      const subscriptionStore = useSubscriptionStore();

      this.deeplinkState = DeepLinkState.Received;
      this.loadingMessage = 'Received deep link...';

      await delay(1000);

      const parsed = new URL(url);
      if (parsed.protocol.replace(':', '') !== 'leafvpn') {
        throw new Error(
          `Invalid scheme: expected 'leafvpn', got '${parsed.protocol}'`
        );
      }
      if (parsed.hostname !== 'install') {
        throw new Error(
          `Invalid host: expected 'install', got '${parsed.hostname}'`
        );
      }

      const params = parsed.searchParams;
      const profileParam = params.get('profile');
      if (!profileParam) throw new Error("Missing 'profile' query parameter");

      // try normal base64 then URL-safe
      let decoded: string | null = null;
      try {
        decoded = atob(profileParam);
      } catch {
        // URL-safe base64 -> replace - _ and pad
        const padded = profileParam.replace(/-/g, '+').replace(/_/g, '/');
        const pad = padded.length % 4;
        const paddedFinal = pad === 0 ? padded : padded + '='.repeat(4 - pad);
        try {
          decoded = atob(paddedFinal);
        } catch {
          throw new Error('Base64 decode failed');
        }
      }

      if (!decoded || decoded.trim() === '') {
        throw new Error('Decoded profile is empty');
      }

      // size check (UUID v4 is always 36 characters)
      if (decoded.length > 36) {
        throw new Error('Decoded profile is unexpectedly large');
      }

      // success path: trigger same behaviour as 'parsed' event
      this.deeplinkState = DeepLinkState.Loading;
      this.loadingMessage = 'Processing profile...';
      this.currentProfile = decoded;

      await subscriptionStore.updateSubscription(decoded);
    },
  },
});
