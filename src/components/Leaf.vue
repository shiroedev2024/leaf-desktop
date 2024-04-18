<template>
  <v-textarea v-model="config" full-width label="Config"></v-textarea>
  <v-btn @click="running ? stopLeaf() : runLeaf()" :loading=loading>{{ running ? "Stop" : "Start" }}</v-btn>
</template>

<script lang="ts">
import { message } from "@tauri-apps/api/dialog";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { defineComponent } from 'vue';

enum State {
  Running = "running",
  StartSuccess = "start_success",
  StartError = "start_error",
  StopSuccess = "stop_success",
  StopError = "stop_error",
  NotRunning = "not_running"
}

interface LeafResult {
  state: State;
  message?: string | null;
}

export default defineComponent({
  name: 'Leaf',
  data() {
    return {
      loading: false,
      running: false,
      config: ""
    };
  },
  async created() {
    this.loadConfig();
    await this.startListening();
    await this.waitForWindows();
    await this.isLeafRunning();
  },
  watch: {
    config(newConfig, _oldConfig) {
      console.log("newConfig", newConfig);
      this.saveConfig(newConfig);
    }
  },
  methods: {
    async startListening() {
      await listen('leaf_event', async (event: any) => {
        console.log(event);

        const payload = event.payload as LeafResult;
        const state: State = payload.state;

        switch (state) {
          case State.Running:
            this.running = true;
            break;
          case State.NotRunning:
            this.running = false;
            break;

          case State.StartSuccess:
            break;
          case State.StopSuccess:
            this.running = false;
            break;
          case State.StartError:
            this.running = false;
            await message(payload.message ?? "Unexpected error");
            break;
          case State.StopError:
            break;
        };

        this.loading = false;
      })
    },
    async waitForWindows() {
      await appWindow.onCloseRequested(async (event) => {
        if (this.running) {
          await message("Leaf is running. Please stop it first.");
          event.preventDefault();
        }
      });
    },
    async runLeaf() {
      this.loading = true;
      await invoke("run_leaf", { config: this.config });
      setTimeout(async () => {
        await this.isLeafRunning();
      }, 1000);
    },
    async stopLeaf() {
      this.loading = true;
      await invoke("stop_leaf");
    },
    async isLeafRunning() {
      await invoke("is_leaf_running");
    },
    loadConfig() {
      this.config = window.localStorage.getItem("config") || "";
    },
    saveConfig(newConfig: string) {
      window.localStorage.setItem("config", newConfig);
    }
  }
});
</script>