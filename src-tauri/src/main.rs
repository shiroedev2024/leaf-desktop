#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use leaf_sdk_desktop::{CoreState, LeafState, SubscriptionState};
use log::info;
use notify::{Event as NotifyEvent, RecursiveMode, Result as NotifyResult, Watcher};
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::env;
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager, RunEvent, Runtime, Window};
use tauri_plugin_shell::ShellExt;
mod helper;
mod tray;
mod tray_icon_manager;
mod window_manager;

#[cfg(unix)]
pub const DAEMONIZE: bool = true;

#[cfg(windows)]
pub const DAEMONIZE: bool = true;

pub static LATEST_CORE_STATE: Lazy<Mutex<Option<CoreState>>> = Lazy::new(|| Mutex::new(None));
pub static LATEST_LEAF_STATE: Lazy<Mutex<Option<LeafState>>> = Lazy::new(|| Mutex::new(None));
pub static LATEST_SUBSCRIPTION_STATE: Lazy<Mutex<Option<SubscriptionState>>> =
    Lazy::new(|| Mutex::new(None));
pub static FILE_WATCHER: Lazy<Mutex<Option<notify::RecommendedWatcher>>> =
    Lazy::new(|| Mutex::new(None));

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileWatchEvent {
    pub path: String,
    pub event_type: String,
}

fn core_callback<R: Runtime>(window: Window<R>, state: CoreState) {
    info!("Core state: {:?}", state);
    *LATEST_CORE_STATE.lock() = Some(state.clone());
    window.emit("core-event", state).unwrap();

    // Update tray icon based on new state
    tray_icon_manager::update_tray_icon(window.app_handle());
}

fn leaf_callback<R: Runtime>(window: Window<R>, state: LeafState) {
    info!("Leaf state: {:?}", state);
    *LATEST_LEAF_STATE.lock() = Some(state.clone());
    window.emit("leaf-event", state).unwrap();

    // Update tray icon based on new state
    tray_icon_manager::update_tray_icon(window.app_handle());
}

fn subscription_state<R: Runtime>(window: Window<R>, state: SubscriptionState) {
    info!("Subscription state: {:?}", state);
    *LATEST_SUBSCRIPTION_STATE.lock() = Some(state.clone());
    window.emit("subscription-event", state).unwrap();
}

fn file_watch_callback<R: Runtime>(window: Window<R>, event: FileWatchEvent) {
    info!("File watch event: {:?}", event);
    window.emit("file-watch-event", event).unwrap();
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
fn auto_update_subscription<R: Runtime>(_app: AppHandle<R>, window: Window<R>) {
    leaf_sdk_desktop::auto_update_subscription(move |state| {
        subscription_state(window.clone(), state.clone());
    });
}

#[tauri::command]
fn update_subscription<R: Runtime>(_app: AppHandle<R>, window: Window<R>, client_id: String) {
    // Pass `None` for tls and fragment to let the library auto-select the best options.
    leaf_sdk_desktop::update_subscription(None, None, client_id, move |state| {
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

#[tauri::command]
fn start_file_watcher<R: Runtime>(
    _app: AppHandle<R>,
    window: Window<R>,
    file_path: String,
) -> Result<(), String> {
    let mut watcher_lock = FILE_WATCHER.lock();

    if watcher_lock.is_some() {
        return Err("File watcher is already running".to_string());
    }

    let window_clone = window.clone();
    let watcher = notify::recommended_watcher(move |res: NotifyResult<NotifyEvent>| match res {
        Ok(event) => {
            let event_type = match event.kind {
                notify::EventKind::Create(_) => "create",
                notify::EventKind::Modify(_) => "modify",
                notify::EventKind::Remove(_) => "remove",
                _ => "other",
            };

            for path in event.paths {
                let file_event = FileWatchEvent {
                    path: path.to_string_lossy().to_string(),
                    event_type: event_type.to_string(),
                };
                file_watch_callback(window_clone.clone(), file_event);
            }
        }
        Err(e) => {
            info!("File watcher error: {:?}", e);
        }
    })
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    *watcher_lock = Some(watcher);

    let watcher_guard = watcher_lock.as_mut().unwrap();
    watcher_guard
        .watch(
            std::path::Path::new(&file_path),
            RecursiveMode::NonRecursive,
        )
        .map_err(|e| format!("Failed to watch file: {}", e))?;

    info!("Started watching file: {}", file_path);
    Ok(())
}

#[tauri::command]
fn stop_file_watcher<R: Runtime>(_app: AppHandle<R>, _window: Window<R>) -> Result<(), String> {
    let mut watcher_lock = FILE_WATCHER.lock();

    if watcher_lock.is_none() {
        return Err("File watcher is not running".to_string());
    }

    *watcher_lock = None;
    info!("Stopped file watcher");
    Ok(())
}

#[tauri::command]
fn is_file_watcher_running<R: Runtime>(_app: AppHandle<R>, _window: Window<R>) -> bool {
    FILE_WATCHER.lock().is_some()
}

#[tauri::command]
fn watch_sidecar_binary<R: Runtime>(app: AppHandle<R>, window: Window<R>) -> Result<(), String> {
    let sidecar = app.shell().sidecar("leaf-ipc").unwrap();
    let command: Command = sidecar.into();
    let program = command.get_program().to_string_lossy().to_string();

    start_file_watcher(app, window, program)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            info!("Single instance triggered with args: {:?}", argv);

            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                let _ = window_manager::WindowManager::show_main_window(&app_clone).await;
            });
        }))
        .plugin(tauri_plugin_opener::init())
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

            // Initialize tray icon with correct initial state
            tray_icon_manager::init_tray_icon(handle);

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
            start_file_watcher,
            stop_file_watcher,
            is_file_watcher_running,
            watch_sidecar_binary,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                info!("Process exiting...");
            }
        });
}
