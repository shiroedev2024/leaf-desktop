import { defineStore } from 'pinia';
import {
  UpdateState,
  UpdateType,
  UpdateInfo,
  UpdateProgress,
  LinuxSystemInfo,
  LinuxUpdateResponse,
} from '../types/types.ts';
import { invoke } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { fetch } from '@tauri-apps/plugin-http';
import { getVersion } from '@tauri-apps/api/app';
import { ask } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useLeafStore } from './leaf.ts';
import { Utils } from '../utils/Utils.ts';
import type { Update } from '@tauri-apps/plugin-updater';
import { markRaw } from 'vue';

export const useUpdateStore = defineStore('update', {
  state: () => ({
    updateState: UpdateState.Initial as UpdateState,
    updateError: '',
    updateInfo: null as UpdateInfo | null,
    updateProgress: null as UpdateProgress | null,
    systemInfo: null as LinuxSystemInfo | null,
    isUpdateDialogOpen: false,
    _updateResource: null as Update | null,
  }),

  getters: {
    isCheckingForUpdates: (state) => state.updateState === UpdateState.Checking,
    isUpdateAvailable: (state) => state.updateState === UpdateState.Available,
    isNotAvailable: (state) => state.updateState === UpdateState.NotAvailable,
    isDownloading: (state) => state.updateState === UpdateState.Downloading,
    isDownloaded: (state) => state.updateState === UpdateState.Downloaded,
    isInstalling: (state) => state.updateState === UpdateState.Installing,
    hasError: (state) => state.updateState === UpdateState.Error,

    updateButtonText: (state) => {
      switch (state.updateState) {
        case UpdateState.Checking:
          return 'Checking...';
        case UpdateState.Downloading:
          return 'Downloading...';
        case UpdateState.Installing:
          return 'Installing...';
        case UpdateState.Available:
          return `Update Available (${state.updateInfo?.version || 'Unknown'})`;
        case UpdateState.NotAvailable:
          return 'Up to Date';
        case UpdateState.Error:
          return 'Retry Update';
        default:
          return 'Check for Updates';
      }
    },

    canInstallUpdate: (state) => {
      return (
        state.updateState === UpdateState.Downloaded ||
        (state.updateState === UpdateState.Available &&
          state.updateInfo?.type === UpdateType.Linux)
      );
    },

    updateMessage: (state) => {
      if (state.updateError) {
        return state.updateError;
      }
      return '';
    },

    isLinuxUpdate: (state) => state.updateInfo?.type === UpdateType.Linux,
    isTauriUpdate: (state) => state.updateInfo?.type === UpdateType.Tauri,
  },

  actions: {
    async init(): Promise<void> {
      try {
        this.systemInfo = (await invoke(
          'detect_linux_system_info'
        )) as LinuxSystemInfo;
      } catch (e) {
        console.error('Failed to get system info:', e);
        this.systemInfo = null;
      }
    },

    async checkForUpdates(): Promise<void> {
      if (
        this.isCheckingForUpdates ||
        this.isDownloading ||
        this.isInstalling
      ) {
        return;
      }

      this.updateState = UpdateState.Checking;
      this.updateError = '';
      this.updateInfo = null;
      this.updateProgress = null;

      try {
        if (this.systemInfo) {
          await this.checkForLinuxUpdate();
        } else {
          await this.checkForTauriUpdate();
        }
      } catch (e) {
        this.updateState = UpdateState.Error;
        this.updateError = e instanceof Error ? e.message : String(e);
        console.error('Error checking for updates:', e);
      }
    },

    async checkForLinuxUpdate(): Promise<void> {
      if (!this.systemInfo) {
        throw new Error('Linux system info not available');
      }

      const currentVersion = await getVersion();
      let baseUrl: string;
      if (import.meta.env.DEV) {
        baseUrl = 'https://obliging-lemming-stirred.loca.lt';
      } else {
        baseUrl = 'https://litevpn.top';
      }

      const url = `${baseUrl}/downloads/linux/${this.systemInfo.packageManagerType}/${this.systemInfo.arch}/${currentVersion}`;

      console.log('Checking for Linux update at:', url);

      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Failed to check for updates: ${response.status}`);
      }

      const data: LinuxUpdateResponse = await response.json();
      console.log('Linux update data:', data);

      if (data.available) {
        this.updateState = UpdateState.Available;
        this.updateInfo = {
          available: true,
          version: data.version || 'Unknown version',
          notes: data.notes,
          releaseDate: data.release_date,
          url: data.url || '',
          type: UpdateType.Linux,
        };
      } else {
        this.updateState = UpdateState.NotAvailable;
      }
    },

    async checkForTauriUpdate(): Promise<void> {
      const update = await check();
      if (update) {
        console.log(`Found update ${update.version} from ${update.date}`);

        this.updateState = UpdateState.Available;
        this.updateInfo = {
          available: true,
          version: update.version,
          notes: update.body,
          releaseDate: update.date,
          url: '',
          type: UpdateType.Tauri,
        };
      } else {
        this.updateState = UpdateState.NotAvailable;
        // Clear any existing update resource when no update is available
        if (this._updateResource) {
          await this._updateResource.close().catch(() => {});
          this._updateResource = null;
        }
      }
    },

    async downloadTauriUpdate(): Promise<void> {
      if (!this.isUpdateAvailable || !this.isTauriUpdate) {
        return;
      }

      this.updateState = UpdateState.Downloading;
      this.updateProgress = { downloaded: 0, total: 0, percentage: 0 };

      try {
        // Check again to get a fresh update instance
        const update = await check();
        if (!update) {
          throw new Error('Update no longer available');
        }

        // Close any existing update resource before storing a new one
        if (this._updateResource) {
          await this._updateResource.close().catch(() => {});
        }

        // Store the new update resource with markRaw
        this._updateResource = markRaw(update);

        let downloaded = 0;
        let contentLength: number | undefined = 0;

        await this._updateResource.download(async (event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength;
              this.updateProgress = {
                downloaded: 0,
                total: contentLength || 0,
                percentage: 0,
              };
              console.log(`Started downloading ${contentLength} bytes`);
              break;

            case 'Progress': {
              downloaded += event.data.chunkLength;
              const percentage = contentLength
                ? (downloaded / contentLength) * 100
                : 0;
              this.updateProgress = {
                downloaded,
                total: contentLength || 0,
                percentage: Math.round(percentage),
              };
              console.log(
                `Downloaded ${downloaded} from ${contentLength} bytes (${percentage.toFixed(1)}%)`
              );
              break;
            }

            case 'Finished':
              console.log('Download finished - Setting state to Downloaded');
              this.updateState = UpdateState.Downloaded;
              console.log('Current updateState:', this.updateState);
              break;
          }
        });
      } catch (e) {
        this.updateState = UpdateState.Error;
        this.updateError = e instanceof Error ? e.message : String(e);
        console.error('Error downloading update:', e);
      }
    },

    async installUpdate(): Promise<void> {
      if (!this.canInstallUpdate || !this.updateInfo) {
        return;
      }

      if (this.isLinuxUpdate) {
        await this.installLinuxUpdate();
      } else if (this.isTauriUpdate) {
        await this.installTauriUpdate();
      }
    },

    async installLinuxUpdate(): Promise<void> {
      if (!this.updateInfo?.url) {
        throw new Error('Download URL not available');
      }

      try {
        await openUrl(this.updateInfo.url);
        this.updateState = UpdateState.NotAvailable;
      } catch (e) {
        this.updateState = UpdateState.Error;
        this.updateError = e instanceof Error ? e.message : String(e);
        console.error('Error opening download URL:', e);
      }
    },

    async installTauriUpdate(): Promise<void> {
      this.updateState = UpdateState.Installing;

      try {
        const leafStore = useLeafStore();

        if (await leafStore.isCoreRunning()) {
          console.log('Core is running; checking Leaf status');

          if (await leafStore.isLeafRunning()) {
            const userAgreed = await ask(
              'A VPN connection (Leaf) is currently active. To install the update we need to stop the VPN. Do you want to stop the VPN now and continue the update?',
              {
                title: 'Stop VPN to Update',
                okLabel: 'Yes',
                cancelLabel: 'No',
              }
            );

            if (userAgreed) {
              console.log('User agreed to stop Leaf (VPN)');
              await leafStore.stopLeaf();

              const leafStopped = await Utils.waitFor(
                async () => !(await leafStore.isLeafRunning()),
                15000,
                300
              );
              if (!leafStopped) {
                throw new Error('Timed out waiting for Leaf to stop');
              }

              console.log('Stopping core before update');
              await leafStore.shutdownCore();

              const coreStopped = await Utils.waitFor(
                async () => !(await leafStore.isCoreRunning()),
                15000,
                300
              );
              if (!coreStopped) {
                throw new Error('Timed out waiting for Core to stop');
              }
            } else {
              this.updateState = UpdateState.Downloaded;
              console.log(
                'User cancelled stopping VPN; aborting update install'
              );
              return;
            }
          } else {
            console.log(
              'Core is running but VPN is not active; stopping core automatically before update'
            );
            await leafStore.shutdownCore();

            const coreStopped = await Utils.waitFor(
              async () => !(await leafStore.isCoreRunning()),
              15000,
              300
            );
            if (!coreStopped) {
              throw new Error('Timed out waiting for Core to stop');
            }
          }
        }

        if (!this._updateResource) {
          throw new Error('Update resource not available');
        }

        try {
          await this._updateResource.install();
          await relaunch();
        } finally {
          // always close the resource when finished
          await this._updateResource.close();
          this._updateResource = null;
        }
      } catch (e) {
        this.updateState = UpdateState.Error;
        this.updateError = e instanceof Error ? e.message : String(e);
        console.error('Error installing update:', e);
      }
    },

    openUpdateDialog(): void {
      if (
        this.isUpdateAvailable ||
        this.isDownloaded ||
        this.isDownloading ||
        this.isInstalling
      ) {
        this.isUpdateDialogOpen = true;
      }
    },

    closeUpdateDialog(): void {
      this.isUpdateDialogOpen = false;
    },

    resetUpdateState(): void {
      this.updateState = UpdateState.Initial;
      this.updateError = '';
      this.updateInfo = null;
      this.updateProgress = null;
      this.isUpdateDialogOpen = false;
      if (this._updateResource) {
        this._updateResource.close().catch((err) => {
          void err;
        });
        this._updateResource = null;
      }
    },
  },
});
