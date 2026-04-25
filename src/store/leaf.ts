import { defineStore } from 'pinia';
import { CoreEvent, CoreState, LeafEvent, LeafState } from '../types/types.ts';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { info, error, warn } from '../utils/logger';

export const useLeafStore = defineStore('leaf', {
  state: () => ({
    leafState: LeafState.Stopped as LeafState,
    leafError: '',
    leafUnlistenFn: null as UnlistenFn | null,

    coreState: CoreState.Stopped as CoreState,
    coreError: '',
    coreUnlistenFn: null as UnlistenFn | null,

    isCancelling: false,

    // Ping monitoring state
    pingTimer: null as ReturnType<typeof setInterval> | null,
    pingFailureCount: 0,
    pingIntervalMs: 5000, // 5 seconds
    maxPingFailures: 2, // Reset state after 2 consecutive failures

    // Startup timeout state
    startTimeoutTimer: null as ReturnType<typeof setTimeout> | null,
  }),

  getters: {
    leafButtonIcon: (state) => {
      if (state.leafState === LeafState.Started) {
        return 'mdi mdi-power'; // modern disconnect icon
      }
      if (
        state.leafState === LeafState.Loading ||
        state.leafState === LeafState.Reloaded ||
        state.coreState === CoreState.Loading
      ) {
        return 'mdi mdi-loading mdi-spin';
      }
      return 'mdi mdi-shield-check-outline'; // modern connect icon
    },

    leafButtonText: (state) => {
      if (state.leafState === LeafState.Started) {
        return 'Disconnect';
      }
      if (
        state.leafState === LeafState.Loading ||
        state.leafState === LeafState.Reloaded
      ) {
        return 'Starting VPN...';
      }
      if (state.coreState === CoreState.Loading) {
        return 'Starting Core...';
      }
      return 'Connect';
    },
  },

  actions: {
    async init(): Promise<void> {
      this.coreUnlistenFn = await listen<CoreEvent>(
        'core-event',
        async (event) => {
          info('core event', event);

          const coreState = event.payload;

          switch (coreState.type) {
            case 'starting':
              this.coreState = CoreState.Loading;
              break;
            case 'started':
              this.coreState = CoreState.Started;
              this.startPingTimer();
              await this.startLeaf();
              break;
            case 'stopped':
              this.coreState = CoreState.Stopped;
              this.leafState = LeafState.Stopped;
              this.stopPingTimer();
              this.clearStartTimeout();
              break;
            case 'error':
              this.coreState = CoreState.Error;
              this.coreError = coreState.data.error;
              this.stopPingTimer();
              this.clearStartTimeout();
              break;
          }
        }
      );

      this.leafUnlistenFn = await listen<LeafEvent>(
        'leaf-event',
        async (event) => {
          info('leaf event', event);

          const leafState = event.payload;

          switch (leafState.type) {
            case 'starting':
              this.leafState = LeafState.Loading;
              break;
            case 'started':
              this.leafState = LeafState.Started;
              this.clearStartTimeout();
              break;
            case 'stopped':
              this.leafState = LeafState.Stopped;
              this.clearStartTimeout();
              break;
            case 'reloaded':
              this.leafState = LeafState.Reloaded;
              setTimeout(async () => {
                if (await this.isLeafRunning()) {
                  this.leafState = LeafState.Started;
                  this.clearStartTimeout();
                }
              }, 1000);
              break;
            case 'error':
              this.leafState = LeafState.Error;
              this.leafError = leafState.data.error;
              this.clearStartTimeout();
              break;
          }
        }
      );
    },

    clearStartTimeout() {
      if (this.startTimeoutTimer) {
        clearTimeout(this.startTimeoutTimer);
        this.startTimeoutTimer = null;
      }
    },

    beginStartTimeout() {
      this.clearStartTimeout();
      this.startTimeoutTimer = setTimeout(async () => {
        if (this.leafState !== LeafState.Started) {
          warn('Connection timed out after 35 seconds. Aborting.');
          this.leafError = 'Connection timed out. Please try again.';
          this.leafState = LeafState.Error;
          await this.cancelCoreStart();
          await this.forceShutdownCore();
        }
      }, 35000); // 35 seconds timeout
    },

    async toggleLeaf(): Promise<void> {
      try {
        await this.verifyFileIntegrity();
        info('asset files verified');
      } catch (e) {
        this.coreState = CoreState.Error;
        this.coreError = e as string;
        this.leafState = LeafState.Stopped;
        return;
      }

      if (this.leafState === LeafState.Started) {
        await this.stopLeaf();
      } else {
        this.beginStartTimeout();
        if (this.coreState !== CoreState.Started) {
          await this.startCore();
          return;
        }

        await this.startLeaf();
      }
    },

    async verifyFileIntegrity(): Promise<void> {
      await invoke('verify_file_integrity');
    },

    async startCore(): Promise<void> {
      if (this.coreState === CoreState.Started) {
        return;
      }

      this.coreState = CoreState.Loading;

      try {
        await invoke('start_core');
      } catch (e) {
        this.coreState = CoreState.Error;
        this.coreError = e as string;
        this.leafState = LeafState.Stopped;
        this.clearStartTimeout();
      }
    },

    async cancelCoreStart(): Promise<void> {
      if (this.coreState !== CoreState.Loading || this.isCancelling) {
        return;
      }

      this.isCancelling = true;
      this.clearStartTimeout();

      try {
        await this.forceShutdownCore();
      } catch (e) {
        warn('Failed to force shutdown core:', e);
      }

      this.coreState = CoreState.Stopped;
      this.coreError = '';
      this.leafState = LeafState.Stopped;
      this.isCancelling = false;
    },

    async shutdownCore(): Promise<void> {
      await invoke('shutdown_core');
    },

    async forceShutdownCore(): Promise<void> {
      await invoke('force_shutdown_core');
    },

    async isCoreRunning(): Promise<boolean> {
      return await invoke('is_core_running');
    },

    async startLeaf(): Promise<void> {
      if (this.leafState === LeafState.Started) {
        return;
      }

      this.leafState = LeafState.Loading;

      // first test config
      try {
        await invoke('test_config');
      } catch (e) {
        this.leafState = LeafState.Error;
        this.leafError = e as string;
        this.clearStartTimeout();
        return;
      }

      try {
        await invoke('run_leaf');
      } catch (e) {
        this.leafState = LeafState.Error;
        this.leafError = e as string;
        this.clearStartTimeout();
      }
    },

    async stopLeaf(): Promise<void> {
      this.clearStartTimeout();
      await invoke('stop_leaf');
    },

    async reloadLeaf(): Promise<void> {
      if (this.leafState !== LeafState.Started) {
        return;
      }

      this.leafState = LeafState.Loading;

      try {
        await invoke('reload_leaf');
      } catch (e) {
        this.leafState = LeafState.Error;
        this.leafError = e as string;

        setTimeout(async () => {
          if (await this.isLeafRunning()) {
            this.leafState = LeafState.Started;
          }
        }, 1000);
      }
    },

    async isLeafRunning(): Promise<boolean> {
      try {
        return await invoke('is_leaf_running');
      } catch (e) {
        error('is_leaf_running failed', e);
        return false;
      }
    },

    async ping(): Promise<string> {
      try {
        return await invoke('ping');
      } catch (e) {
        error('ping failed', e);
        throw e;
      }
    },

    startPingTimer(): void {
      if (this.pingTimer) {
        this.stopPingTimer();
      }

      info('Starting ping timer');
      this.pingTimer = setInterval(async () => {
        await this.performPing();
      }, this.pingIntervalMs);
    },

    stopPingTimer(): void {
      if (this.pingTimer) {
        info('Stopping ping timer');
        clearInterval(this.pingTimer);
        this.pingTimer = null;
        this.pingFailureCount = 0;
      }
    },

    async performPing(): Promise<void> {
      try {
        const response = await this.ping();
        info('Ping response:', response);

        // Reset failure count on successful ping
        if (this.pingFailureCount > 0) {
          info('Ping recovered, resetting failure count');
          this.pingFailureCount = 0;
        }
      } catch (err) {
        this.pingFailureCount++;
        warn(
          `Ping failed (${this.pingFailureCount}/${this.maxPingFailures}):`,
          err
        );

        // If we've failed too many times, assume core was stopped externally
        if (this.pingFailureCount >= this.maxPingFailures) {
          error('Core appears to be stopped externally, resetting state');
          this.resetLeafState();
        }
      }
    },

    resetLeafState(): void {
      info('Resetting leaf store state due to external core stop');
      this.stopPingTimer();
      this.clearStartTimeout();

      this.coreState = CoreState.Stopped;
      this.coreError = '';
      this.leafState = LeafState.Stopped;
      this.leafError = '';
    },

    async getCurrentStatus(): Promise<void> {
      if (await this.isCoreRunning()) {
        this.coreState = CoreState.Started;
        this.startPingTimer();

        if (await this.isLeafRunning()) {
          this.leafState = LeafState.Started;
        } else {
          this.leafState = LeafState.Stopped;
        }
      } else {
        this.coreState = CoreState.Stopped;
        this.leafState = LeafState.Stopped;
      }
    },

    async dispose(): Promise<void> {
      if (this.leafUnlistenFn) {
        this.leafUnlistenFn();
        this.leafUnlistenFn = null;
      }

      if (this.coreUnlistenFn) {
        this.coreUnlistenFn();
        this.coreUnlistenFn = null;
      }

      this.stopPingTimer();
      this.clearStartTimeout();
    },

    async getVersions(): Promise<string> {
      return await invoke('get_versions');
    },
  },
});
