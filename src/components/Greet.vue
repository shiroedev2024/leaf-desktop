<script setup lang="ts">
import { invoke } from "@tauri-apps/api/tauri";
import { ref } from "vue";

const config = ref("");
const result = ref(0);

async function start_leaf(runtime_id) {
  result.value = await invoke("start_leaf", { runtime_id, config: config.value });
}

async function reload_leaf(runtime_id) {
  result.value = await invoke("reload_leaf", { runtime_id });
}

async function stop_leaf(runtime_id) {
  result.value = await invoke("stop_leaf", { runtime_id });
}
</script>

<template>
  <form class="row" @submit.prevent="start_leaf">
    <textarea id="config" v-model="config" placeholder="Leaf Config..." />
    <button type="submit">Start</button>
    <button @click="reload_leaf">Reload</button>
    <button @click="stop_leaf">Stop</button>
  </form>

  <p>{{ result }}</p>
</template>
