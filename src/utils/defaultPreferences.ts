import { UpdateLeafPreferences } from '../types/types';

export function getDefaultPreferences(
  userAgent?: string
): UpdateLeafPreferences {
  return {
    enable_ipv6: true,
    prefer_ipv6: false,
    memory_logger: true,
    log_level: 2,
    api_port: 10001,
    auto_reload: false,
    user_agent:
      userAgent ||
      (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    bypass_lan: true,
    bypass_lan_in_core: true,
    fake_ip: false,
    force_resolve_domain: false,
    bypass_geoip_list: [],
    bypass_geosite_list: [],
    reject_geoip_list: [],
    reject_geosite_list: [],
  };
}
