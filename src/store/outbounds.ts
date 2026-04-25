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
    pingCache: {} as Record<string, number | null>, // Retain ping states globally
  }),

  getters: {
    displayOutbounds: (state) => state.outbounds,
  },

  actions: {
    resetState(): void {
      this.outboundState = OutboundState.Initial;
      this.outbounds = [];
      this.selectedSubgroupTag = null;
      // Intentionally NOT clearing pingCache so historical pings are served when re-connecting.
    },

    isGroupTag(tag: string): boolean {
      // Identifies global groups and country directories
      return (
        tag === 'OUT' ||
        tag === 'AUTO' ||
        tag.endsWith('_AUTO') ||
        tag.length === 2 // e.g., US, GB, DE
      );
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
          // Hydrate from cache if available, otherwise undefined (loading state)
          ping_ms:
            this.pingCache[o.name] !== undefined
              ? this.pingCache[o.name]
              : undefined,
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
      // Filter out global groups / directories to ignore unnecessary pings
      const outboundNamesToPing = currentOutbounds
        .map((o) => o.name)
        .filter((name) => !this.isGroupTag(name));

      try {
        for (const name of outboundNamesToPing) {
          try {
            const health = await preferencesStore.api.getOutboundHealth(name);
            const ms = health.tcp_ms;

            this.pingCache[name] = ms; // Cache result
            const outbound = currentOutbounds.find((o) => o.name === name);
            if (outbound) {
              outbound.ping_ms = ms;
            }
          } catch (e) {
            error(`Failed to ping outbound ${name}:`, e);
            this.pingCache[name] = null; // Cache failure
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
      if (this.isGroupTag(outboundName)) return;

      const preferencesStore = usePreferencesStore();

      try {
        const health =
          await preferencesStore.api.getOutboundHealth(outboundName);
        const ms = health.tcp_ms;

        this.pingCache[outboundName] = ms; // Cache result
        const currentOutbounds = this.outbounds;
        const outbound = currentOutbounds.find((o) => o.name === outboundName);
        if (outbound) {
          outbound.ping_ms = ms;
        }
      } catch (e) {
        error(`Failed to ping outbound ${outboundName}:`, e);
        this.pingCache[outboundName] = null; // Cache failure
        const currentOutbounds = this.outbounds;
        const outbound = currentOutbounds.find((o) => o.name === outboundName);
        if (outbound) {
          outbound.ping_ms = null;
        }
      }
    },
  },
});
