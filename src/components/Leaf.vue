<script setup lang="ts">
import { invoke } from "@tauri-apps/api/tauri";
import { ref, watch } from "vue";

const isRunning = ref(false);
const config = ref("");

async function runLeaf() {
  try {
    await invoke("run_leaf", { config: config.value });
    isRunning.value = true;
  } catch (error) {
    console.error("Error running leaf:", error);
  }
}

async function stopLeaf() {
  try {
    await invoke("stop_leaf");
    await isLeafRunning(); // Check after stopping
  } catch (error) {
    console.error("Error stopping leaf:", error);
  }
}

async function isLeafRunning() {
  try {
    isRunning.value = await invoke("is_leaf_running");
  } catch (error) {
    console.error("Error checking if leaf is running:", error);
    isRunning.value = false; // Assume not running on error
  }
}

function toggleLeaf() {
  isRunning.value ? stopLeaf() : runLeaf();
}

function loadConfig() {
  config.value = window.localStorage.getItem("config") || "";
}

function saveConfig(config: string) {
  window.localStorage.setItem("config", config);
}

watch(
  config,
  (newConfig) => {
    saveConfig(newConfig); // Save config whenever it changes
  },
  { deep: true } // Enable deep watching for nested config changes
);

loadConfig();
</script>

<template>
  <v-textarea v-model="config" full-width label="Config"></v-textarea>
  <v-btn @click="toggleLeaf">{{ isRunning ? "Stop" : "Start" }}</v-btn>
</template>
