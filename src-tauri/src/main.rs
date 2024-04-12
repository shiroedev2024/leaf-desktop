// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn start_leaf(rt_id: u16, config: &str) -> i32 {
    let opts = leaf::StartOptions {
        config: leaf::Config::Str(config.to_string()),
        runtime_opt: leaf::RuntimeOption::SingleThread,
    };
    if let Err(e) = leaf::start(rt_id, opts) {
        eprintln!("failed to start leaf: {}", e);
        return 1;
    }
    return 0;
}

#[tauri::command]
fn reload_leaf(rt_id: u16) -> i32 {
    if let Err(e) = leaf::reload(rt_id) {
        eprintln!("failed to reload leaf: {}", e);
        return 1;
    }
    return 0;
}

#[tauri::command]
fn stop_leaf(rt_id: u16) -> bool {
    leaf::shutdown(rt_id)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![start_leaf, reload_leaf, stop_leaf])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
