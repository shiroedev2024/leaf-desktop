<template>
  <v-textarea v-model="doh_config" label="Doh Config"></v-textarea>
  <v-btn @click="doh_running ? stopDoh() : runDoh()">{{ doh_running ? "Stop DoH" : "Start DoH" }}</v-btn>

  <v-textarea v-model="leaf_config" full-width label="Leaf Config"></v-textarea>
  <v-btn @click="leaf_running ? stopLeaf() : runLeaf()">{{ leaf_running ? "Stop Leaf" : "Start Leaf" }}</v-btn>
</template>

<script lang="ts">
import { message } from "@tauri-apps/api/dialog";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { defineComponent } from 'vue';

enum AppState {
  StartDohSuccess = "start_doh_success",
  StartLeafSuccess = "start_leaf_success",
}

type AppEvent = {
  state: AppState;
}

export default defineComponent({
  name: 'Leaf',
  data() {
    return {
      leaf_running: false,
      doh_running: false,
      leaf_config: "",
      doh_config: "",
    };
  },
  async created() {
    this.loadConfigs();
    await this.startListening();
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
      await listen('app_event', (event) => {
        let appEvent = event.payload as AppEvent;
        console.log(appEvent);

        if (appEvent.state === AppState.StartDohSuccess) {
          this.doh_running = true;
        } else if (appEvent.state === AppState.StartLeafSuccess) {
          this.leaf_running = true;
        }
      });
    },
    async waitForWindows() {
      await appWindow.onCloseRequested(async (event) => {
        if (this.leaf_running || this.doh_running) {
          await message("Leaf or Doh is running. Please stop it first.");
          event.preventDefault();
        }
      });
    },
    async runDoh() {
      try {
        await invoke("run_doh", { dohConfig: this.doh_config });
      } catch (e) {
        console.error(e);
        this.doh_running = false;
      }
    },
    async isDohRunning() {
      this.doh_running = await invoke("is_doh_running");
    },
    async stopDoh() {
      const result = await invoke("stop_doh");
      if (result) {
        this.doh_running = false;
      }
    },
    async runLeaf() {
      try {
        await invoke("run_leaf", { leafConfig: this.leaf_config });
      } catch (e) {
        console.error(e);
        this.leaf_running = false;
      }
    },
    async reloadLeaf() {
      try {
        await invoke("reload_leaf");
      } catch (e) {
        console.error(e);
        this.leaf_running = false
      }
    },
    async isLeafRunning() {
      this.leaf_running = await invoke("is_leaf_running");
    },
    async stopLeaf() {
      const result = await invoke("stop_leaf");
      if (result) {
        this.leaf_running = false;
      }
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