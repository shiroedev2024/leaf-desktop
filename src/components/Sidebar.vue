<template>
  <div
    class="bg-gray-800 text-white transition-all duration-300 ease-in-out relative flex flex-col"
    :class="{
      'w-16': collapsed,
      'w-64': !collapsed,
      'fixed inset-y-0 left-0 z-50': isSmallScreen,
    }"
  >
    <!-- Toggle Button -->
    <button
      @click="toggleSidebar"
      class="absolute -right-3 top-6 bg-gray-800 hover:bg-gray-700 text-white p-1 rounded-full border border-gray-700 transition-colors z-10"
    >
      <span
        :class="[
          'mdi transform transition-transform duration-200',
          collapsed ? 'mdi-chevron-right' : 'mdi-chevron-left',
        ]"
      ></span>
    </button>

    <!-- Sidebar Content -->
    <div class="p-4 flex-1">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2
          class="text-xl font-bold transition-opacity duration-200"
          :class="{ 'opacity-0': collapsed }"
        >
          Leaf VPN
        </h2>
        <span v-if="collapsed" class="text-xl font-bold" title="Leaf VPN">
          L
        </span>
      </div>

      <!-- Menu Items -->
      <ul>
        <li v-for="(item, index) in menuItems" :key="index" class="mb-2">
          <router-link
            :to="item.route"
            class="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors"
            :class="{ 'bg-gray-700': isActive(item.route) }"
            :title="collapsed ? item.name : ''"
          >
            <span
              :class="[
                'mdi',
                item.icon,
                'flex-shrink-0',
                { 'mr-3': !collapsed },
              ]"
            ></span>
            <span
              class="transition-opacity duration-200 whitespace-nowrap"
              :class="{ 'opacity-0 w-0': collapsed }"
            >
              {{ item.name }}
            </span>
          </router-link>
        </li>
      </ul>

      <!-- Update Section -->
      <div class="mt-6 pt-6 border-t border-gray-700">
        <button
          @click="handleUpdateClick"
          :disabled="updateStore.isCheckingForUpdates"
          class="w-full flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="{ 'bg-gray-700': updateStore.isUpdateAvailable }"
          :title="collapsed ? updateStore.updateButtonText : ''"
        >
          <span
            :class="[
              'flex-shrink-0',
              updateStore.isCheckingForUpdates
                ? 'mdi mdi-loading mdi-spin'
                : updateStore.isUpdateAvailable
                  ? 'mdi mdi-download'
                  : 'mdi mdi-update',
              { 'mr-3': !collapsed },
            ]"
          ></span>
          <span
            class="text-sm transition-opacity duration-200 whitespace-nowrap"
            :class="{ 'opacity-0 w-0': collapsed }"
          >
            {{ updateStore.updateButtonText }}
          </span>
          <span
            v-if="updateStore.isUpdateAvailable"
            class="ml-auto w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"
            :class="{ 'ml-0': collapsed }"
          ></span>
        </button>

        <!-- Update Status Badge -->
        <div
          v-if="updateStore.isUpdateAvailable && !collapsed"
          class="mt-2 text-xs text-gray-400 text-center transition-opacity duration-200"
        >
          Version {{ updateStore.updateInfo?.version }} available
        </div>
      </div>
    </div>

    <!-- Versions Section -->
    <div
      v-if="!collapsed"
      class="p-4 border-t border-gray-700 text-center mb-2"
    >
      <p class="text-xs text-gray-400">{{ versions }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUpdateStore } from '../store/update.ts';
import { Store } from '@tauri-apps/plugin-store';
import { useLeafStore } from '../store/leaf.ts';

export default defineComponent({
  name: 'SidebarComponent',
  setup() {
    const route = useRoute();
    const updateStore = useUpdateStore();
    const leafStore = useLeafStore();
    const collapsed = ref(false);
    const isSmallScreen = ref(false);
    const versions = ref('');

    const checkScreenSize = () => {
      const isSmall = window.innerWidth < 768; // md breakpoint
      isSmallScreen.value = isSmall;
      if (isSmall && !collapsed.value) {
        collapsed.value = true;
      } else if (!isSmall && collapsed.value) {
        collapsed.value = false;
      }
    };

    onMounted(async () => {
      try {
        const store = await Store.load('app_data.bin');
        const saved = await store.get('sidebar-collapsed');
        if (saved !== null) {
          collapsed.value = saved as boolean;
        }
      } catch (error) {
        console.error('Failed to load sidebar state from store:', error);
      }

      checkScreenSize();

      window.addEventListener('resize', checkScreenSize);

      // Fetch versions
      try {
        versions.value = await leafStore.getVersions();
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      }
    });

    onUnmounted(() => {
      window.removeEventListener('resize', checkScreenSize);
    });

    const menuItems = [
      { name: 'Dashboard', route: '/dashboard', icon: 'mdi-home' },
      { name: 'Subscriptions', route: '/subscription', icon: 'mdi-account' },
      { name: 'Settings', route: '/settings', icon: 'mdi-cog' },
    ];

    const isActive = (path: string) => route.path === path;

    const handleUpdateClick = async () => {
      if (
        updateStore.isUpdateAvailable ||
        updateStore.isDownloading ||
        updateStore.isDownloaded ||
        updateStore.isInstalling
      ) {
        updateStore.openUpdateDialog();
      } else {
        await updateStore.checkForUpdates();
      }
    };

    const toggleSidebar = async () => {
      collapsed.value = !collapsed.value;
      try {
        const store = await Store.load('app_data.bin');
        await store.set('sidebar-collapsed', collapsed.value);
        await store.save();
      } catch (error) {
        console.error('Failed to save sidebar state to store:', error);
      }
    };

    return {
      menuItems,
      isActive,
      handleUpdateClick,
      collapsed,
      toggleSidebar,
      isSmallScreen,
      updateStore,
      versions,
    };
  },
});
</script>
