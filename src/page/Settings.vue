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
            description="Apply LAN bypass rules inside the VPN core rather than the system routing table"
          />

          <SettingsToggle
            v-model="preferences.fake_ip"
            label="Fake IP"
            description="Return fake IP addresses for DNS queries to prevent DNS leaks"
          />

          <SettingsToggle
            v-model="preferences.force_resolve_domain"
            label="Force Resolve Domain"
            description="Resolve domains to IPs before applying routing rules"
          />

          <SettingsToggle
            v-model="preferences.internal_dns_server"
            label="Enable Inbound DNS Server"
            description="Enable built-in DNS server for better internal DNS resolution"
          />

          <Message type="warning" class="mt-4 text-sm">
            <i class="mdi mdi-alert mr-1"></i>
            <strong>Note:</strong> Changing any LAN Bypass settings modifies
            core system routing. You must completely
            <strong>Disconnect and Reconnect</strong> the VPN for these changes
            to take effect.
          </Message>
        </SettingsSection>

        <!-- Bypass / Reject Lists Section -->
        <SettingsSection
          title="Bypass / Reject Lists"
          icon="mdi mdi-shield-outline"
        >
          <Message type="info" class="mb-4 text-sm">
            <ul class="list-disc pl-4 space-y-1">
              <li>
                <strong>GeoIP</strong> entries must be 2-letter ISO country
                codes (e.g., <code>ir</code>, <code>ru</code>, <code>cn</code>).
                Do not use IP addresses or CIDRs.
              </li>
              <li>
                <strong>Geosite</strong> entries must be v2ray geosite
                categories (e.g., <code>category-ads</code>). Do not use domains
                or regex.
              </li>
            </ul>
          </Message>

          <!-- Quick Presets -->
          <div class="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <span class="block text-sm font-semibold text-gray-700 mb-3"
              >Quick Presets</span
            >
            <div class="flex flex-wrap gap-2">
              <button
                @click="applyPreset('ir')"
                class="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-blue-50 hover:border-blue-300 text-sm focus:outline-none transition-colors"
              >
                <img
                  src="/flags/ir.png"
                  class="w-5 h-[15px] object-cover rounded-sm mr-2 shadow-sm"
                  alt="IR"
                />
                Bypass Iran
              </button>
              <button
                @click="applyPreset('ru')"
                class="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-blue-50 hover:border-blue-300 text-sm focus:outline-none transition-colors"
              >
                <img
                  src="/flags/ru.png"
                  class="w-5 h-[15px] object-cover rounded-sm mr-2 shadow-sm"
                  alt="RU"
                />
                Bypass Russia
              </button>
              <button
                @click="applyPreset('cn')"
                class="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-blue-50 hover:border-blue-300 text-sm focus:outline-none transition-colors"
              >
                <img
                  src="/flags/cn.png"
                  class="w-5 h-[15px] object-cover rounded-sm mr-2 shadow-sm"
                  alt="CN"
                />
                Bypass China
              </button>
              <button
                @click="applyBlockAds()"
                class="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-red-50 hover:border-red-300 text-sm focus:outline-none transition-colors"
              >
                <i class="mdi mdi-shield-off text-red-500 mr-2 text-lg"></i>
                Block Ads
              </button>
            </div>
          </div>

          <SettingsListEditor
            v-model="preferences.bypass_geoip_list"
            label="Bypass GeoIP List"
            description="GeoIP country codes to bypass (comma-separated or one per line)"
          />

          <SettingsListEditor
            v-model="preferences.bypass_geosite_list"
            label="Bypass Geosite List"
            description="Geosite categories to bypass (comma-separated or one per line)"
          />

          <SettingsListEditor
            v-model="preferences.reject_geoip_list"
            label="Reject GeoIP List"
            description="GeoIP country codes to reject (comma-separated or one per line)"
          />

          <SettingsListEditor
            v-model="preferences.reject_geosite_list"
            label="Reject Geosite List"
            description="Geosite categories to reject (comma-separated or one per line)"
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

    const applyPreset = (code: string) => {
      if (!preferences.value.bypass_geoip_list?.includes(code)) {
        preferences.value.bypass_geoip_list = [
          ...(preferences.value.bypass_geoip_list || []),
          code,
        ];
      }
      if (!preferences.value.bypass_geosite_list?.includes(code)) {
        preferences.value.bypass_geosite_list = [
          ...(preferences.value.bypass_geosite_list || []),
          code,
        ];
      }
    };

    const applyBlockAds = () => {
      if (!preferences.value.reject_geosite_list?.includes('category-ads')) {
        preferences.value.reject_geosite_list = [
          ...(preferences.value.reject_geosite_list || []),
          'category-ads',
        ];
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
        internal_dns_server:
          preferencesStore.leafPreferences.internal_dns_server ?? false,
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
      applyPreset,
      applyBlockAds,
    };
  },
};
</script>

<style scoped></style>
