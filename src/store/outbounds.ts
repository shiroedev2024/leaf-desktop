import { defineStore } from 'pinia';
import { OutboundInfo } from '../api/OutboundInfo.ts';
import { OutboundState } from '../types/types.ts';
import { usePreferencesStore } from './preferences.ts';
import { error } from '../utils/logger';

export const useOutboundsStore = defineStore('outbounds', {
  state: () => ({
    outboundState: 'Initial' as OutboundState,
    outbounds: [] as OutboundInfo[],
  }),

  getters: {},

  actions: {
    resetState(): void {
      this.outboundState = OutboundState.Initial;
      this.outbounds = [];
    },

    async getOutbounds() {
      this.outboundState = OutboundState.Loading;

      const preferencesStore = usePreferencesStore();
      try {
        this.outbounds = (
          await preferencesStore.api.getSelectOutboundItems('OUT')
        ).outbounds;
        this.outboundState = OutboundState.Success;
      } catch (e) {
        error(e);
        this.outboundState = OutboundState.Error;
      }
    },

    async changeSelectedOutbound(outbound: string) {
      const preferencesStore = usePreferencesStore();

      try {
        await preferencesStore.api.setSelectOutboundItem('OUT', outbound);

        this.outbounds.find((o) => o.is_selected)!.is_selected = false;
        this.outbounds.find((o) => o.name === outbound)!.is_selected = true;
      } catch (e) {
        error(e);
      }
    },

    async refreshPings() {
      const preferencesStore = usePreferencesStore();

      // Capture array reference at start to prevent race conditions
      const currentOutbounds = this.outbounds;
      const outboundNames = currentOutbounds.map((o) => o.name);

      try {
        for (const name of outboundNames) {
          try {
            const health = await preferencesStore.api.getOutboundHealth(name);
            // Use captured reference to avoid race conditions
            const outbound = currentOutbounds.find((o) => o.name === name);
            if (outbound) {
              outbound.ping_ms = health.tcp_ms;
            }
          } catch (e) {
            error(`Failed to ping outbound ${name}:`, e);
            // Use captured reference to avoid race conditions
            const outbound = currentOutbounds.find((o) => o.name === name);
            if (outbound) {
              outbound.ping_ms = null;
            }
          }
        }
      } catch (e) {
        error('Failed to refresh pings:', e);
      }
    },

    async pingOutbound(outboundName: string) {
      const preferencesStore = usePreferencesStore();

      try {
        const health =
          await preferencesStore.api.getOutboundHealth(outboundName);
        // Capture array reference to avoid race conditions
        const currentOutbounds = this.outbounds;
        const outbound = currentOutbounds.find((o) => o.name === outboundName);
        if (outbound) {
          outbound.ping_ms = health.tcp_ms;
        }
      } catch (e) {
        error(`Failed to ping outbound ${outboundName}:`, e);
        // Capture array reference to avoid race conditions
        const currentOutbounds = this.outbounds;
        const outbound = currentOutbounds.find((o) => o.name === outboundName);
        if (outbound) {
          outbound.ping_ms = null;
        }
      }
    },
  },
});
