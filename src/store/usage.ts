import { defineStore } from 'pinia';
import { usePreferencesStore } from './preferences';
import { useLeafStore } from './leaf';
import { LeafState } from '../types/types';

export const useUsageStore = defineStore('usage', {
  state: () => ({
    sentHistory: [] as number[],
    recvdHistory: [] as number[],
    totalSent: 0,
    totalRecvd: 0,
    currentSentSpeed: 0, // bytes/s
    currentRecvdSpeed: 0, // bytes/s
    lastSentBytes: 0,
    lastRecvdBytes: 0,
    pollingInterval: null as ReturnType<typeof setInterval> | null,
    maxHistory: 30, // 30 seconds of history
  }),

  actions: {
    async fetchUsage() {
      const preferencesStore = usePreferencesStore();
      const leafStore = useLeafStore();

      if (leafStore.leafState !== LeafState.Started) {
        this.currentSentSpeed = 0;
        this.currentRecvdSpeed = 0;
        this.updateHistory();
        return;
      }

      try {
        const usage = await preferencesStore.api.getUsage('tun');

        if (this.lastSentBytes > 0 || this.lastRecvdBytes > 0) {
          // If the new values are smaller, the core probably restarted or reset counters
          if (
            usage.bytes_sent < this.lastSentBytes ||
            usage.bytes_recvd < this.lastRecvdBytes
          ) {
            this.currentSentSpeed = 0;
            this.currentRecvdSpeed = 0;
          } else {
            this.currentSentSpeed = usage.bytes_sent - this.lastSentBytes;
            this.currentRecvdSpeed = usage.bytes_recvd - this.lastRecvdBytes;
          }
        } else {
          // First poll in this session
          this.currentSentSpeed = 0;
          this.currentRecvdSpeed = 0;
        }

        this.lastSentBytes = usage.bytes_sent;
        this.lastRecvdBytes = usage.bytes_recvd;
        this.totalSent = usage.bytes_sent;
        this.totalRecvd = usage.bytes_recvd;

        this.updateHistory();
      } catch {
        // Silently fail, reset speeds
        this.currentSentSpeed = 0;
        this.currentRecvdSpeed = 0;
        this.updateHistory();
      }
    },

    updateHistory() {
      this.sentHistory.push(this.currentSentSpeed);
      this.recvdHistory.push(this.currentRecvdSpeed);

      if (this.sentHistory.length > this.maxHistory) {
        this.sentHistory.shift();
      }
      if (this.recvdHistory.length > this.maxHistory) {
        this.recvdHistory.shift();
      }
    },

    startPolling() {
      if (this.pollingInterval) return;

      // Reset speed accumulation on start
      this.lastSentBytes = 0;
      this.lastRecvdBytes = 0;

      this.fetchUsage(); // Fetch immediately
      this.pollingInterval = setInterval(() => {
        this.fetchUsage();
      }, 1000);
    },

    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      this.currentSentSpeed = 0;
      this.currentRecvdSpeed = 0;
    },
  },
});
