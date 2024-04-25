#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::{IpAddr, SocketAddr};

use serde::{Deserialize, Serialize};
use tauri::{Runtime, Window};

#[derive(Serialize, Clone)]
enum AppState {
    #[serde(rename = "start_doh_success")]
    StartDohSuccess,
    #[serde(rename = "start_leaf_success")]
    StartLeafSuccess,
}

#[derive(Serialize, Clone)]
struct AppEvent {
    state: AppState,
}

#[derive(Deserialize)]
struct DohConfig {
    listen: SocketAddr,
    server: SocketAddr,
    domain: String,
    path: String,
    post: bool,
    fragment: bool,
    fragment_packets: String,
    fragment_lengths: String,
    fragment_intervals: String,
}

#[tauri::command]
async fn run_doh<R: Runtime>(
    _app: tauri::AppHandle<R>,
    window: Window<R>,
    doh_config: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let doh_config: DohConfig = serde_json::from_str(doh_config.as_str())
            .map_err(|e| format!("failed to parse doh config: {}", e))?;
        let listen_config = doh::ListenConfig::Addr(doh_config.listen);

        let ip = match doh_config.server.ip() {
            IpAddr::V4(v4) => v4.to_string(),
            IpAddr::V6(v6) => v6.to_string(),
        };
        let port = doh_config.server.port();

        let remote_config = if !doh_config.fragment {
            doh::RemoteHost::Direct(ip, port)
        } else {
            let (packets_from, packets_to) = parse_fragment_option(doh_config.fragment_packets)?;
            let (length_min, length_max) = parse_fragment_option(doh_config.fragment_lengths)?;
            let (interval_min, interval_max) =
                parse_fragment_option(doh_config.fragment_intervals)?;

            doh::RemoteHost::Fragment(
                ip,
                port,
                packets_from,
                packets_to,
                length_min,
                length_max,
                interval_min,
                interval_max,
            )
        };

        let doh_config = doh::Config::new(
            listen_config,
            remote_config,
            doh_config.domain.as_str(),
            None,
            None,
            doh_config.path.as_str(),
            1,
            10,
            doh_config.post,
            0,
            false,
        )
        .map_err(|e| format!("failed to create doh config: {}", e))?;

        window
            .emit(
                "app_event",
                AppEvent {
                    state: AppState::StartDohSuccess,
                },
            )
            .map_err(|e| format!("failed to emit app_event: {}", e))?;

        if let Err(e) = doh::run_doh(doh_config) {
            Err(format!("failed to start doh: {}", e))
        } else {
            Ok(())
        }
    })
    .await
    .map_err(|e| format!("failed to start doh: {}", e))?
}

#[tauri::command]
fn is_doh_running<R: Runtime>(_app: tauri::AppHandle<R>, _window: Window<R>) -> bool {
    doh::is_doh_running()
}

#[tauri::command]
fn stop_doh<R: Runtime>(_app: tauri::AppHandle<R>, _window: Window<R>) -> bool {
    doh::shutdown_doh().is_ok()
}

#[tauri::command]
async fn run_leaf<R: Runtime>(
    _app: tauri::AppHandle<R>,
    window: Window<R>,
    leaf_config: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let options = leaf::StartOptions {
            config: leaf::Config::Str(leaf_config),
            runtime_opt: leaf::RuntimeOption::SingleThread,
        };

        window
            .emit(
                "app_event",
                AppEvent {
                    state: AppState::StartLeafSuccess,
                },
            )
            .map_err(|e| format!("failed to emit app_event: {}", e))?;

        if let Err(e) = leaf::start(0, options) {
            Err(format!("failed to start leaf: {}", e))
        } else {
            Ok(())
        }
    })
    .await
    .map_err(|e| format!("failed to start leaf: {}", e))?
}

#[tauri::command]
fn is_leaf_running<R: Runtime>(_app: tauri::AppHandle<R>, _window: Window<R>) -> bool {
    leaf::is_running(0)
}

#[tauri::command]
async fn reload_leaf<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: Window<R>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        if let Err(e) = leaf::reload(0) {
            Err(format!("failed to reload leaf: {}", e))
        } else {
            Ok(())
        }
    })
    .await
    .map_err(|e| format!("failed to reload leaf: {}", e))?
}

#[tauri::command]
fn stop_leaf<R: Runtime>(_app: tauri::AppHandle<R>, _window: Window<R>) -> bool {
    leaf::shutdown(0)
}

fn parse_fragment_option(option: String) -> Result<(u64, u64), String> {
    let parts: Vec<&str> = option.split('-').map(str::trim).collect();
    if parts.len() == 2 {
        let start = parts[0]
            .parse::<u64>()
            .map_err(|_| "failed to parse as u64")?;
        let end = parts[1]
            .parse::<u64>()
            .map_err(|_| "failed to parse as u64")?;
        Ok((start, end))
    } else {
        Err("invalid fragment option".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            run_doh,
            is_doh_running,
            stop_doh,
            run_leaf,
            reload_leaf,
            is_leaf_running,
            stop_leaf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
