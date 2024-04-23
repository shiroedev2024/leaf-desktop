<template>
  <v-textarea v-model="leaf_config" full-width label="Leaf Config"></v-textarea>
  <v-textarea v-model="doh_config" label="Doh Config"></v-textarea>
  <v-btn @click="is_leaf_running && is_doh_running ? stop() : start()" :loading=loading>{{ is_leaf_running && is_doh_running ? "Stop" : "Start" }}</v-btn>
</template>

<script lang="ts">
import { message } from "@tauri-apps/api/dialog";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { defineComponent } from 'vue';

enum State {
  LeafRunning = "leaf_running",
  StartLeafSuccess = "start_leaf_success",
  StartLeafError = "start_leaf_error",
  StopLeafSuccess = "stop_leaf_success",
  StopLeafError = "stop_leaf_error",
  LeafNotRunning = "leaf_not_running",
  DohRunning = "doh_running",
  StartDohSuccess = "start_doh_success",
  StartDohError = "start_doh_error",
  StopDohSuccess = "stop_doh_success",
  StopDohError = "stop_doh_error",
  DohNotRunning = "doh_not_running",
}

interface Result {
  state: State;
  message?: string | null;
}

export default defineComponent({
  name: 'Leaf',
  data() {
    return {
      loading: false,
      is_leaf_running: false,
      is_doh_running: false,
      leaf_config: "",
      doh_config: "",
    };
  },
  async created() {
    this.loadConfigs();
    await this.startListening();
    await this.isLeafRunning();
    await this.isDohRunning();
    await this.waitForWindows();
  },
  watch: {
    leaf_config(newConfig, _oldConfig) {
      console.log("newLeafConfig", newConfig);
      this.saveLeafConfig(newConfig);
    },
    doh_config(newConfig, _oldConfig) {
      console.log("newDohConfig", newConfig);
      this.saveDohConfig(newConfig);
    }
  },
  methods: {
    async startListening() {
      await listen('custom_event', async (event: any) => {
        console.log(event);

        const payload = event.payload as Result;
        const state: State = payload.state;

        switch (state) {
          case State.LeafRunning:
            this.is_leaf_running = true;
            break;
          case State.LeafNotRunning:
            this.is_leaf_running = false;
            break;

          case State.StartLeafSuccess:
            break;
          case State.StopLeafSuccess:
            this.is_leaf_running = false;
            break;
          case State.StartLeafError:
            this.is_leaf_running = false;
            await message(payload.message ?? "Unexpected error");
            break;
          case State.StopLeafError:
            break;

          case State.DohRunning:
            this.is_doh_running = true;
            break;
          case State.DohNotRunning:
            this.is_doh_running = false;
            break;

          case State.StartDohSuccess:
            break;
          case State.StopDohSuccess:
            this.is_doh_running = false;
            break;
          case State.StartDohError:
            this.is_doh_running = false;
            await message(payload.message ?? "Unexpected error");
            break;
          case State.StopDohError:
            break;
        }

        this.loading = false;
      })
    },
    async waitForWindows() {
      await appWindow.onCloseRequested(async (event) => {
        if (this.is_leaf_running || this.is_doh_running) {
          await message("Leaf or Doh is running. Please stop it first.");
          event.preventDefault();
        }
      });
    },
    async start() {
      this.loading = true;
      await invoke("start", { leafConfig: this.leaf_config , dohConfig: this.doh_config});

      setTimeout(async () => {
        await this.isLeafRunning();
        console.log("checking for leaf running");
      }, 1000);
      setTimeout(async () => {
        await this.isDohRunning();
        console.log("checking for doh running");
      }, 1000);
    },
    async stop() {
      this.loading = true;
      await invoke("stop");
    },
    async isLeafRunning() {
      await invoke("is_leaf_running");
    },
    async isDohRunning() {
      await invoke("is_doh_running");
    },
    loadConfigs() {
      this.leaf_config = window.localStorage.getItem("leaf_config") || "";
      this.doh_config = window.localStorage.getItem("doh_config") || "";
    },
    saveLeafConfig(newConfig: string) {
      window.localStorage.setItem("leaf_config", newConfig);
    },
    saveDohConfig(newConfig: string) {
      window.localStorage.setItem("doh_config", newConfig);
    }
  }
});
</script>