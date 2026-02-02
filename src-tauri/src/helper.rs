use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Deserialize, Clone)]
pub struct UpdateLeafPreferences {
    enable_ipv6: bool,
    prefer_ipv6: bool,
    memory_logger: bool,
    log_level: i32,
    api_port: u16,
    auto_reload: bool,
    user_agent: String,
    bypass_lan: bool,
    bypass_lan_in_core: bool,
    fake_ip: bool,
    force_resolve_domain: bool,
    internal_dns_server: bool,
    bypass_geoip_list: Option<Vec<String>>,
    bypass_geosite_list: Option<Vec<String>>,
    reject_geoip_list: Option<Vec<String>>,
    reject_geosite_list: Option<Vec<String>>,
}

pub fn set_preferences(preferences: String) -> Result<()> {
    let update_preferences: UpdateLeafPreferences = serde_json::from_str(&preferences)?;

    leaf_sdk_desktop::set_preferences(
        update_preferences.enable_ipv6,
        update_preferences.prefer_ipv6,
        update_preferences.memory_logger,
        update_preferences.log_level,
        update_preferences.api_port,
        update_preferences.auto_reload,
        update_preferences.user_agent,
        update_preferences.bypass_lan,
        update_preferences.bypass_lan_in_core,
        update_preferences.fake_ip,
        update_preferences.force_resolve_domain,
        update_preferences.bypass_geoip_list,
        update_preferences.bypass_geosite_list,
        update_preferences.reject_geoip_list,
        update_preferences.reject_geosite_list,
        update_preferences.internal_dns_server,
    )
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LinuxSystemInfo {
    #[serde(rename = "packageManagerType")]
    package_manager_type: String,
    arch: String,
}

pub fn detect_linux_system_info() -> Result<LinuxSystemInfo> {
    let distro = System::distribution_id().to_lowercase();
    let family = System::distribution_id_like();
    let arch = System::cpu_arch().to_lowercase();

    let package_manager_type =
        if distro == "ubuntu" || distro == "debian" || family.iter().any(|f| f == "debian") {
            "apt"
        } else if distro == "fedora"
            || distro == "centos"
            || distro == "rhel"
            || family.iter().any(|f| f == "rhel" || f == "fedora")
        {
            "rpm"
        } else if distro == "arch" || family.iter().any(|f| f == "arch") {
            "pacman"
        } else {
            return Err(anyhow!("Could not determine Linux package manager type"));
        }
        .to_string();

    Ok(LinuxSystemInfo {
        package_manager_type,
        arch,
    })
}
