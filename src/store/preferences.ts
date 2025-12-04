import { defineStore } from 'pinia';
import { LeafPreferences, UpdateLeafPreferences } from '../types/types';
import ApiClient from '../api/ApiClient';
import { invoke } from '@tauri-apps/api/core';
import { Utils } from '../utils/Utils';

export const usePreferencesStore = defineStore('preferences', {
  state: () => ({
    leafPreferences: {} as LeafPreferences,
    api: new ApiClient(),
  }),

  getters: {
    lastUpdatedTime: (state) => {
      const lastUpdatedTime = state.leafPreferences.last_update_time || 0;
      if (lastUpdatedTime > 0) {
        return Utils.getRelativeTime(new Date(lastUpdatedTime * 1000));
      } else {
        return 'Never';
      }
    },
    remainingTraffic: (state) => {
      const traffic = state.leafPreferences.traffic;
      if (traffic > 0) {
        return Utils.formatBytes(traffic - state.leafPreferences.used_traffic);
      } else if (traffic === 0) {
        return '∞';
      } else {
        return 'N/A';
      }
    },
    remainingTrafficColor: (state) => {
      const used = state.leafPreferences.used_traffic;
      const total = state.leafPreferences.traffic;

      if (total === 0) return 'text-green-600'; // success

      const remaining = total - used;
      if (remaining <= 0) {
        return 'text-red-600'; // error
      } else if (remaining <= total * 0.1) {
        return 'text-yellow-600'; // warning
      } else {
        return 'text-green-600'; // success
      }
    },
    expireTimeColor: (state) => {
      let expireDate;
      if (state.leafPreferences.expire_time) {
        expireDate = new Date(state.leafPreferences.expire_time).getTime();
      } else {
        expireDate = 0;
      }

      const now = new Date().getTime();

      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const timeDifference = expireDate - now;

      if (timeDifference <= 0) {
        return 'text-red-600'; // error
      } else if (timeDifference <= oneWeek) {
        return 'text-yellow-600'; // warning
      } else {
        return 'text-green-600'; // success
      }
    },
    isExpired: (state) => {
      if (!state.leafPreferences.expire_time) {
        return false;
      }
      const now = new Date();
      const expireDate = new Date(state.leafPreferences.expire_time);
      return now > expireDate;
    },
    isTrafficReached: (state) => {
      return (
        state.leafPreferences.traffic > 0 &&
        state.leafPreferences.used_traffic >= state.leafPreferences.traffic
      );
    },
  },

  actions: {
    async fetchLeafPreferences(): Promise<void> {
      const preferences = await invoke('get_preferences');
      this.leafPreferences = preferences as LeafPreferences;
      this.api = new ApiClient(this.leafPreferences.api_port);
    },
    async updateLeafPreferences(
      preferences: UpdateLeafPreferences
    ): Promise<void> {
      await invoke('set_preferences', {
        preferences: JSON.stringify({
          ...preferences,
          log_level: Number(preferences.log_level),
          api_port: Number(preferences.api_port),
        }),
      });
      await this.fetchLeafPreferences();
    },
  },
});
