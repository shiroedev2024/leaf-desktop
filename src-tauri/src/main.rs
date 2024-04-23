#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::BufRead;
use std::net::{IpAddr, SocketAddr};
use std::sync::{Arc, Mutex, MutexGuard};

use serde::{Deserialize, Serialize};
use tauri::{Runtime, Window};

#[derive(Clone, Serialize)]
enum State {
    #[serde(rename = "leaf_running")]
    LeafRunning,
    #[serde(rename = "start_leaf_success")]
    StartLeafSuccess,
    #[serde(rename = "start_leaf_error")]
    StartLeafError,
    #[serde(rename = "stop_leaf_success")]
    StopLeafSuccess,
    #[serde(rename = "stop_leaf_error")]
    StopLeafError,
    #[serde(rename = "leaf_not_running")]
    LeafNotRunning,
    #[serde(rename = "doh_running")]
    DohRunning,
    #[serde(rename = "start_doh_success")]
    StartDohSuccess,
    #[serde(rename = "start_doh_error")]
    StartDohError,
    #[serde(rename = "stop_doh_success")]
    StopDohSuccess,
    #[serde(rename = "stop_doh_error")]
    StopDohError,
    #[serde(rename = "doh_not_running")]
    DohNotRunning,
}

#[derive(Clone, Serialize)]
struct Result {
    state: State,
    message: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
struct Doh {
    listen: String,
    server: String,
    domain: String,
    path: String,
    post: bool,
    fragment: bool,
    fragment_packets: String,
    fragment_lengths: String,
    fragment_intervals: String,
}

fn send_event<R: Runtime>(window: MutexGuard<Window<R>>, state: State, message: Option<String>) {
    window.emit("custom_event", Result {
        state,
        message,
    }).unwrap();
}

#[tauri::command]
fn start<R: Runtime>(_app: tauri::AppHandle<R>, window: Window<R>, leaf_config: String, doh_config: String) {
    let window = Arc::new(Mutex::new(window));

    let window_clone = window.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if !doh::is_doh_running() {
            let doh_config: Doh = serde_json::from_str(doh_config.as_str()).unwrap();

            let listen_config = doh::ListenConfig::Addr(doh_config.listen.parse().unwrap());

            let server: SocketAddr = doh_config.server.parse().unwrap();
            let ip = match server.ip() {
                IpAddr::V4(v4) => v4.to_string(),
                IpAddr::V6(v6) => v6.to_string(),
            };
            let port = server.port();

            let remote_config = if doh_config.fragment {
                let (packets_from, packets_to) = parse_fragment_option(doh_config.fragment_packets).unwrap();
                let (length_min, length_max) = parse_fragment_option(doh_config.fragment_lengths).unwrap();
                let (interval_min, interval_max) = parse_fragment_option(doh_config.fragment_intervals).unwrap();

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
            } else {
                doh::RemoteHost::Direct(ip, port)
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
            ).unwrap();

            match doh::run_doh(doh_config) {
                Ok(_) => send_event(window_clone.lock().unwrap(), State::StopDohSuccess, None),
                Err(e) => send_event(window_clone.lock().unwrap(), State::StartDohError, Some(e.to_string())),
            }
        } else {
            println!("doh already running");
        };
    });

    let window_clone = window.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if !leaf::is_running(0) {
            let options = leaf::StartOptions {
                config: leaf::Config::Str(leaf_config),
                runtime_opt: leaf::RuntimeOption::SingleThread,
            };
            match leaf::start(0, options) {
                Ok(_) => send_event(window_clone.lock().unwrap(), State::StopLeafSuccess, None),
                Err(e) => send_event(window_clone.lock().unwrap(), State::StartLeafError, Some(e.to_string())),
            };
        } else {
            println!("leaf already running");
        };
    });
}

#[tauri::command]
fn stop<R: Runtime>(_app: tauri::AppHandle<R>, window: Window<R>) {
    let window = Arc::new(Mutex::new(window));

    let window_clone = window.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if doh::is_doh_running() {
            if doh::shutdown_doh().is_err() {
                send_event(window_clone.lock().unwrap(), State::StopDohError, None);
            }
        } else {
            println!("doh not running");
        }
    });

    let window_clone = window.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if leaf::is_running(0) {
            if !leaf::shutdown(0) {
                send_event(window_clone.lock().unwrap(), State::StopLeafError, None);
            }
        } else {
            println!("leaf not running");
        }
    });
}

#[tauri::command]
fn is_leaf_running<R: Runtime>(_app: tauri::AppHandle<R>, window: Window<R>) {
    let window = Arc::new(Mutex::new(window));

    let window_clone = window.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if leaf::is_running(0) {
            send_event(window_clone.lock().unwrap(), State::LeafRunning, None);
        } else {
            send_event(window_clone.lock().unwrap(), State::LeafNotRunning, None);
        }
    });
}

#[tauri::command]
fn is_doh_running<R: Runtime>(_app: tauri::AppHandle<R>, window: Window<R>) {
    let window = Arc::new(Mutex::new(window));

    let window_clone = window.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if doh::is_doh_running() {
            send_event(window_clone.lock().unwrap(), State::DohRunning, None);
        } else {
            send_event(window_clone.lock().unwrap(), State::DohNotRunning, None);
        }
    });
}

fn parse_fragment_option(option: String) -> Option<(u64, u64)> {
    let parts: Vec<&str> = option.split('-').map(str::trim).collect();
    if parts.len() == 2 {
        let start = parts[0].parse::<u64>().ok()?;
        let end = parts[1].parse::<u64>().ok()?;
        Some((start, end))
    } else {
        None
    }
}

fn main() {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    sudo::escalate_if_needed().unwrap();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start, stop, is_leaf_running, is_doh_running])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
