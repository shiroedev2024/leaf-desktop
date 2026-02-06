import { defineStore } from 'pinia';
import { OutboundInfo } from '../api/OutboundInfo.ts';
import { OutboundState } from '../types/types.ts';
import { usePreferencesStore } from './preferences.ts';
import { error } from '../utils/logger';

export const useOutboundsStore = defineStore('outbounds', {
  state: () => ({
    outboundState: 'Initial' as OutboundState,
    outbounds: [] as OutboundInfo[],
    selectedSubgroupTag: null as string | null,
  }),

  getters: {
    displayOutbounds: (state) => state.outbounds,
  },

  actions: {
    resetState(): void {
      this.outboundState = OutboundState.Initial;
      this.outbounds = [];
      this.selectedSubgroupTag = null;
    },

    async getOutbounds() {
      const preferencesStore = usePreferencesStore();
      const tag = this.selectedSubgroupTag || 'OUT';

      try {
        const selectedResponse =
          await preferencesStore.api.getCurrentSelectOutboundItem(tag);
        const selectedName = selectedResponse.selected;

        if (
          this.outbounds.length > 0 &&
          this.outboundState === OutboundState.Success
        ) {
          this.outbounds.forEach((o) => {
            o.is_selected = o.name === selectedName;
          });
          if (this.outbounds.some((o) => o.is_selected)) return;
        }

        this.outboundState = OutboundState.Loading;

        const itemsResponse =
          await preferencesStore.api.getSelectOutboundItems(tag);

        this.outbounds = itemsResponse.outbounds.map((o) => ({
          ...o,
          is_selected: o.name === selectedName,
        }));

        this.outboundState = OutboundState.Success;
      } catch (e) {
        error(e);
        this.outboundState = OutboundState.Error;
      }
    },

    async setSubgroup(tag: string | null) {
      this.selectedSubgroupTag = tag;
      this.outbounds = []; // Clear current list to force a full fetch for the new tag
      await this.getOutbounds();
    },

    async changeSelectedOutbound(outbound: string) {
      const preferencesStore = usePreferencesStore();

      try {
        const currentTag = this.selectedSubgroupTag || 'OUT';

        await preferencesStore.api.setSelectOutboundItem(currentTag, outbound);

        if (this.selectedSubgroupTag && this.selectedSubgroupTag !== 'OUT') {
          await preferencesStore.api.setSelectOutboundItem(
            'OUT',
            this.selectedSubgroupTag
          );
        }

        this.outbounds.forEach((o) => {
          o.is_selected = o.name === outbound;
        });
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
