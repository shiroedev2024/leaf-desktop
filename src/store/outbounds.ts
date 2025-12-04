import { defineStore } from 'pinia';
import { OutboundInfo } from '../api/OutboundInfo.ts';
import { OutboundState } from '../types/types.ts';
import { usePreferencesStore } from './preferences.ts';

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
        console.error(e);
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
        console.error(e);
      }
    },
  },
});
