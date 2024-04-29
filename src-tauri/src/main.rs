#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::{IpAddr, SocketAddr};

use serde::{Deserialize, Serialize};
use tauri::{Runtime, Window};

#[derive(Serialize, Clone)]
enum AppState {
    #[serde(rename = "start_leaf_success")]
    StartLeafSuccess,
}

#[derive(Serialize, Clone)]
struct AppEvent {
    state: AppState,
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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            run_leaf,
            reload_leaf,
            is_leaf_running,
            stop_leaf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
