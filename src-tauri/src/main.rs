#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use leaf_sdk_desktop::{CoreState, LeafState, SubscriptionState};
use log::{debug, error, info, warn};
use std::env;
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager, RunEvent, Runtime, Window};
use tauri_plugin_shell::ShellExt;
mod helper;
mod tray;
mod window_manager;

#[cfg(unix)]
pub const DAEMONIZE: bool = true;

#[cfg(windows)]
pub const DAEMONIZE: bool = true;

fn core_callback<R: Runtime>(window: Window<R>, state: CoreState) {
    info!("Core state: {:?}", state);
    window.emit("core-event", state).unwrap();
}

fn leaf_callback<R: Runtime>(window: Window<R>, state: LeafState) {
    info!("Leaf state: {:?}", state);
    window.emit("leaf-event", state).unwrap();
}

fn subscription_state<R: Runtime>(window: Window<R>, state: SubscriptionState) {
    info!("Subscription state: {:?}", state);
    window.emit("subscription-event", state).unwrap();
}

#[tauri::command]
fn start_core<R: Runtime>(app: AppHandle<R>, window: Window<R>) -> Result<(), String> {
    let sidecar = app.shell().sidecar("leaf-ipc").unwrap();
    let command: Command = sidecar.into();
    let program = command.get_program().to_string_lossy().to_string();

    leaf_sdk_desktop::start_core(program, DAEMONIZE, move |state| {
        core_callback(window.clone(), state.clone());
    })
    .map_err(|e| format!("start_core failed: {}", e))
}

#[tauri::command]
fn is_core_running<R: Runtime>(_app: AppHandle<R>, _window: Window<R>) -> bool {
    leaf_sdk_desktop::is_core_running()
}

#[tauri::command]
fn shutdown_core<R: Runtime>(_app: AppHandle<R>, window: Window<R>) {
    leaf_sdk_desktop::shutdown_core(DAEMONIZE, move |state| {
        core_callback(window.clone(), state.clone());
    });
}

#[tauri::command]
fn test_config<R: Runtime>(_app: AppHandle<R>, _window: Window<R>) -> Result<(), String> {
    leaf_sdk_desktop::test_config().map_err(|e| format!("test_config failed: {}", e))
}

#[tauri::command]
fn is_leaf_running<R: Runtime>(_app: AppHandle<R>, _window: Window<R>) -> Result<bool, String> {
    leaf_sdk_desktop::is_leaf_running().map_err(|e| format!("is_leaf_running failed: {}", e))
}

#[tauri::command]
fn run_leaf<R: Runtime>(_app: AppHandle<R>, window: Window<R>) -> Result<(), String> {
    leaf_sdk_desktop::run_leaf(move |state| {
        leaf_callback(window.clone(), state.clone());
    })
    .map_err(|e| format!("run_leaf failed: {}", e))
}

#[tauri::command]
fn reload_leaf<R: Runtime>(_app: AppHandle<R>, window: Window<R>) -> Result<(), String> {
    leaf_sdk_desktop::reload_leaf(move |state| {
        leaf_callback(window.clone(), state.clone());
    })
    .map_err(|e| format!("reload_leaf failed: {}", e))
}

#[tauri::command]
fn stop_leaf<R: Runtime>(_app: AppHandle<R>, window: Window<R>) {
    leaf_sdk_desktop::stop_leaf(move |state| {
        leaf_callback(window.clone(), state.clone());
    });
}

#[tauri::command]
fn auto_update_subscription<R: Runtime>(
    _app: AppHandle<R>,
    window: Window<R>,
    tls: bool,
    fragment: bool,
) {
    leaf_sdk_desktop::auto_update_subscription(tls, fragment, move |state| {
        subscription_state(window.clone(), state.clone());
    });
}

#[tauri::command]
fn update_subscription<R: Runtime>(
    _app: AppHandle<R>,
    window: Window<R>,
    tls: bool,
    fragment: bool,
    client_id: String,
) {
    leaf_sdk_desktop::update_subscription(tls, fragment, client_id, move |state| {
        subscription_state(window.clone(), state.clone());
    });
}

#[tauri::command]
fn verify_file_integrity<R: Runtime>(_app: AppHandle<R>, _window: Window<R>) -> Result<(), String> {
    leaf_sdk_desktop::verify_file_integrity()
        .map_err(|e| format!("verify_file_integrity failed: {}", e))
}

#[tauri::command]
fn ping<R: Runtime>(_app: AppHandle<R>, _window: Window<R>) -> Result<String, String> {
    leaf_sdk_desktop::ping().map_err(|e| format!("ping failed: {}", e))
}

#[tauri::command]
fn get_preferences<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
) -> Result<leaf_sdk_desktop::LeafPreferences, String> {
    leaf_sdk_desktop::get_preferences().map_err(|e| format!("get_preferences failed: {}", e))
}

#[tauri::command]
fn set_preferences<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    preferences: String,
) -> Result<(), String> {
    helper::set_preferences(preferences).map_err(|e| format!("set_preferences failed: {}", e))
}

#[tauri::command]
fn detect_linux_system_info<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
) -> Result<helper::LinuxSystemInfo, String> {
    helper::detect_linux_system_info()
        .map_err(|e| format!("detect_linux_system_info failed: {}", e))
}

#[tauri::command]
async fn show_main_window<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let result = window_manager::WindowManager::show_main_window(&app).await;
    Ok(format!("{:?}", result))
}

#[tauri::command]
async fn toggle_main_window<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let result = window_manager::WindowManager::toggle_main_window(&app).await;
    Ok(format!("{:?}", result))
}

#[tauri::command]
fn get_main_window_state<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let state = window_manager::WindowManager::get_main_window_state(&app);
    Ok(format!("{:?}", state))
}

#[tauri::command]
fn get_versions<R: Runtime>(app: AppHandle<R>, _window: Window<R>) -> Result<String, String> {
    let leaf_version = leaf_sdk_desktop::get_version();
    let app_version = app.package_info().version.to_string();
    Ok(format!(
        "Leaf Core: {} | App: {}",
        leaf_version, app_version
    ))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            info!("Single instance triggered with args: {:?}", argv);

            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                let _ = window_manager::WindowManager::show_main_window(&app_clone).await;
            });
        }))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_filename("window_state.json")
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED
                        | tauri_plugin_window_state::StateFlags::FULLSCREEN
                        | tauri_plugin_window_state::StateFlags::DECORATIONS
                        | tauri_plugin_window_state::StateFlags::VISIBLE,
                )
                .build(),
        )
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: None,
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .level(log::LevelFilter::Debug)
                .max_file_size(10_485_760)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5))
                .build(),
        )
        .setup(move |app| {
            let handle = app.handle();
            tray::create_tray(handle)?;

            // Write wintun.dll
            #[cfg(target_os = "windows")]
            leaf_sdk_desktop::setup_wintun()?;

            // update assets
            let version = app.package_info().version.clone();
            leaf_sdk_desktop::update_assets(version.major, version.minor, version.patch)?;

            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window_manager::WindowManager::hide_main_window(window.app_handle());
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            start_core,
            shutdown_core,
            is_core_running,
            test_config,
            is_leaf_running,
            run_leaf,
            stop_leaf,
            reload_leaf,
            auto_update_subscription,
            update_subscription,
            get_preferences,
            set_preferences,
            verify_file_integrity,
            ping,
            detect_linux_system_info,
            show_main_window,
            toggle_main_window,
            get_main_window_state,
            get_versions,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                info!("Process exiting...");
            }
        });
}
