<template>
  <div class="h-full flex flex-col p-4 space-y-4">
    <!-- Messages Section -->
    <Message
      v-if="saved"
      type="success"
      message="Settings saved successfully!"
    />

    <Message v-if="error" type="error" :message="error" />

    <!-- Content Section (Scrollable) -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="space-y-6">
        <!-- Network Settings Section -->
        <SettingsSection title="Network Settings" icon="mdi mdi-network">
          <SettingsToggle
            v-model="preferences.enable_ipv6"
            label="Enable IPv6"
            description="Allow connections over IPv6 networks"
          />

          <SettingsToggle
            v-model="preferences.prefer_ipv6"
            label="Prefer IPv6"
            description="Prioritize IPv6 connections when available"
          />

          <SettingsToggle
            v-model="preferences.bypass_lan"
            label="Bypass LAN"
            description="Allow direct access to local network resources"
          />

          <SettingsToggle
            v-model="preferences.bypass_lan_in_core"
            :disabled="!preferences.bypass_lan"
            label="Bypass LAN In Core"
            description="Apply LAN bypass rules inside the core"
          />

          <SettingsToggle
            v-model="preferences.fake_ip"
            label="Fake IP"
            description="Enable generating fake IP addresses for DNS resolution"
          />

          <SettingsToggle
            v-model="preferences.force_resolve_domain"
            label="Force Resolve Domain"
            description="Force domain resolution through configured resolvers"
          />
        </SettingsSection>

        <!-- Bypass / Reject Lists Section -->
        <SettingsSection
          title="Bypass / Reject Lists"
          icon="mdi mdi-shield-outline"
        >
          <SettingsListEditor
            v-model="preferences.bypass_geoip_list"
            label="Bypass GeoIP List"
            description="List of GeoIP entries to bypass (one per line or comma-separated)"
          />

          <SettingsListEditor
            v-model="preferences.bypass_geosite_list"
            label="Bypass Geosite List"
            description="List of Geosite entries to bypass (one per line or comma-separated)"
          />

          <SettingsListEditor
            v-model="preferences.reject_geoip_list"
            label="Reject GeoIP List"
            description="List of GeoIP entries to reject (one per line or comma-separated)"
          />

          <SettingsListEditor
            v-model="preferences.reject_geosite_list"
            label="Reject Geosite List"
            description="List of Geosite entries to reject (one per line or comma-separated)"
          />
        </SettingsSection>

        <!-- Debug Settings Section -->
        <SettingsSection title="Debug Settings" icon="mdi mdi-bug">
          <SettingsToggle
            v-model="preferences.memory_logger"
            label="Memory Logger"
            description="Store logs in memory for debugging"
          />

          <router-link
            v-if="preferences.memory_logger"
            to="/memory-logger"
            class="block text-blue-600 hover:underline text-sm"
          >
            View Memory Logs
          </router-link>

          <SettingsDropdown
            v-model="preferences.log_level"
            label="Log Level"
            description="Set the verbosity of logging"
            :options="[
              { value: 0, label: 'Trace' },
              { value: 1, label: 'Debug' },
              { value: 2, label: 'Info' },
              { value: 3, label: 'Warn' },
              { value: 4, label: 'Error' },
            ]"
          />

          <SettingsInput
            v-if="debugMode"
            v-model="preferences.api_port"
            label="API Port"
            description="Port number for the internal API server"
            type="number"
            :min="1024"
            :max="65535"
          />

          <SettingsInput
            v-if="debugMode"
            v-model="preferences.user_agent"
            label="Custom User Agent"
            description="Browser identification string for requests"
            type="text"
          />

          <SettingsToggle
            v-if="debugMode"
            v-model="preferences.auto_reload"
            label="Auto Reload"
            description="Automatically reload configuration on changes"
          />
        </SettingsSection>
      </div>
    </div>

    <!-- Bottom Section (Fixed) -->
    <div class="flex-shrink-0 mt-4 border-t pt-4">
      <div class="flex space-x-2">
        <button
          @click="loadDefaults"
          class="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <i class="mdi mdi-reload mr-2"></i>
          Load Defaults
        </button>

        <button
          @click="saveSettings"
          class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <i class="mdi mdi-content-save mr-2"></i>
          Save Settings
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { LeafState, UpdateLeafPreferences } from '../types/types.ts';
import { usePreferencesStore } from '../store/preferences.ts';
import { useLeafStore } from '../store/leaf.ts';
import SettingsSection from '../components/SettingsSection.vue';
import SettingsToggle from '../components/SettingsToggle.vue';
import SettingsDropdown from '../components/SettingsDropdown.vue';
import SettingsInput from '../components/SettingsInput.vue';
import SettingsListEditor from '../components/SettingsListEditor.vue';
import Message from '../components/Message.vue';
import { getDefaultPreferences } from '../utils/defaultPreferences';
import { info } from '../utils/logger';

export default {
  name: 'SettingsComponent',
  components: {
    Message,
    SettingsInput,
    SettingsDropdown,
    SettingsToggle,
    SettingsListEditor,
    SettingsSection,
  },
  setup() {
    const preferencesStore = usePreferencesStore();
    const leafStore = useLeafStore();

    const preferences = ref(
      getDefaultPreferences(navigator.userAgent) as UpdateLeafPreferences
    );
    const debugMode = ref(false);
    const saved = ref(false);
    const error = ref('');

    const saveSettings = async () => {
      info('Saving settings:', preferences.value);

      try {
        await preferencesStore.updateLeafPreferences(preferences.value);
        if (leafStore.leafState == LeafState.Started) {
          await leafStore.reloadLeaf();
        }
        saved.value = true;
      } catch (e) {
        error.value = e as string;
      }
    };

    const loadDefaults = async () => {
      const defaults = getDefaultPreferences(navigator.userAgent);
      // update UI
      preferences.value = { ...defaults } as UpdateLeafPreferences;
      // persist
      try {
        await preferencesStore.updateLeafPreferences(defaults);
        if (leafStore.leafState == LeafState.Started) {
          await leafStore.reloadLeaf();
        }
        saved.value = true;
      } catch (e) {
        error.value = e as string;
      }
    };

    onMounted(async () => {
      await preferencesStore.fetchLeafPreferences();
      preferences.value = {
        ...preferencesStore.leafPreferences,
        user_agent:
          preferencesStore.leafPreferences.user_agent || navigator.userAgent,
        bypass_geoip_list:
          preferencesStore.leafPreferences.bypass_geoip_list || [],
        bypass_geosite_list:
          preferencesStore.leafPreferences.bypass_geosite_list || [],
        reject_geoip_list:
          preferencesStore.leafPreferences.reject_geoip_list || [],
        reject_geosite_list:
          preferencesStore.leafPreferences.reject_geosite_list || [],
        bypass_lan_in_core:
          preferencesStore.leafPreferences.bypass_lan_in_core ?? false,
        fake_ip: preferencesStore.leafPreferences.fake_ip ?? false,
        force_resolve_domain:
          preferencesStore.leafPreferences.force_resolve_domain ?? false,
      };

      debugMode.value = import.meta.env.DEV;
    });

    return {
      preferences,
      debugMode,
      saveSettings,
      loadDefaults,
      saved,
      error,
    };
  },
};
</script>

<style scoped></style>
