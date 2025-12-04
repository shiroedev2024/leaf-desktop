<template>
  <div class="h-full flex flex-col items-center justify-center p-8 bg-gray-50">
    <!-- Loading State -->
    <div
      v-if="deeplinkStore.deeplinkState === 'Loading'"
      class="text-center space-y-4"
    >
      <div
        class="w-16 h-16 border-4 border-t-4 border-blue-500 rounded-full animate-spin mx-auto"
      ></div>
      <p class="text-lg text-gray-700">{{ deeplinkStore.loadingMessage }}</p>
    </div>

    <!-- Success State -->
    <div
      v-else-if="deeplinkStore.deeplinkState === 'Success'"
      class="text-center space-y-6 max-w-md"
    >
      <div
        class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"
      >
        <i class="mdi mdi-check-circle text-5xl text-green-600"></i>
      </div>
      <h2 class="text-2xl font-bold text-gray-800">
        Profile Installed Successfully
      </h2>
      <p class="text-gray-600">
        Your VPN profile has been installed and is ready to use.
      </p>
      <button
        @click="openMainApp"
        class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <i class="mdi mdi-application"></i>
        Open Leaf VPN
      </button>
    </div>

    <!-- Fetch Error State -->
    <div
      v-else-if="deeplinkStore.deeplinkState === 'FetchError'"
      class="text-center space-y-6 max-w-md"
    >
      <div
        class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto"
      >
        <i class="mdi mdi-alert-circle text-5xl text-red-600"></i>
      </div>
      <h2 class="text-2xl font-bold text-gray-800">Installation Failed</h2>
      <p class="text-gray-600">{{ deeplinkStore.errorMessage }}</p>
      <div class="space-y-3">
        <button
          @click="retryInstall"
          class="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <i class="mdi mdi-refresh"></i>
          Retry
        </button>
        <button
          @click="cancel"
          class="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Unknown Error State -->
    <div
      v-else-if="deeplinkStore.deeplinkState === 'UnknownError'"
      class="text-center space-y-6 max-w-md"
    >
      <div
        class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto"
      >
        <i class="mdi mdi-help-circle text-5xl text-red-600"></i>
      </div>
      <h2 class="text-2xl font-bold text-gray-800">Unknown Error</h2>
      <p class="text-gray-600">{{ deeplinkStore.errorMessage }}</p>
      <button
        @click="cancel"
        class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        Close
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { useRouter } from 'vue-router';
import { useDeeplinkStore } from '../store/deeplink';

export default {
  name: 'AutoProfile',
  setup() {
    const router = useRouter();
    const deeplinkStore = useDeeplinkStore();

    const openMainApp = () => {
      router.push('/');
    };

    const cancel = () => {
      router.push('/');
    };

    return {
      retryInstall: deeplinkStore.retryInstall,
      openMainApp,
      cancel,
      deeplinkStore,
    };
  },
};
</script>

<style scoped></style>
