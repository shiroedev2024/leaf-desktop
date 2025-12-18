use crate::window_manager::WindowManager;
use crate::{DAEMONIZE, LATEST_LEAF_STATE};
use leaf_sdk_desktop::{CoreState, LeafState};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Runtime};
use tauri_plugin_notification::NotificationExt;

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .item(&MenuItemBuilder::with_id("toggle_window", "Toggle Window").build(app)?)
        .item(&MenuItemBuilder::with_id("quit", "Quit").build(app)?)
        .build()?;

    TrayIconBuilder::with_id("main")
        .menu(&menu)
        .icon(app.default_window_icon().unwrap().clone())
        .icon_as_template(false)
        .show_menu_on_left_click(false)
        .tooltip("Leaf VPN - VPN client based on Leaf Proxy")
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "quit" => handle_quit(app),
            "toggle_window" => toggle_window(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn handle_quit<R: Runtime>(app: &AppHandle<R>) {
    let leaf_state = LATEST_LEAF_STATE.lock().clone();
    
    if let Some(LeafState::STARTING) = leaf_state {
        let app_clone = app.clone();
        tauri::async_runtime::spawn(async move {
            let _ = app_clone
                .notification()
                .builder()
                .title("Leaf VPN")
                .body("Please wait until VPN finishes starting before quitting.")
                .show();
        });
        return;
    }

    let is_core_running = leaf_sdk_desktop::is_core_running();
    let is_leaf_running = leaf_sdk_desktop::is_leaf_running().unwrap_or(false);

    match (is_core_running, is_leaf_running) {
        (true, true) => {
            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                let _ = app_clone
                    .notification()
                    .builder()
                    .title("Leaf VPN")
                    .body("Please first stop Leaf VPN before quitting.")
                    .show();
            });
        }
        (true, false) => {
            let app_clone = app.clone();
            leaf_sdk_desktop::shutdown_core(DAEMONIZE, move |state| {
                if let CoreState::ERROR { error } = state {
                    let app_clone2 = app_clone.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = app_clone2
                            .notification()
                            .builder()
                            .title("Leaf VPN")
                            .body(format!("Failed to shutdown core: {}", error))
                            .show();
                    });
                }
            });

            app.exit(0);
        }
        (false, _) => {
            app.exit(0);
        }
    }
}

fn toggle_window<R: Runtime>(app: &AppHandle<R>) {
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        let _ = WindowManager::toggle_main_window(&app_clone).await;
    });
}
