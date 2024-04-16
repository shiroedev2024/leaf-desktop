#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Runtime;
use std::thread;

#[tauri::command]
fn run_leaf<R: Runtime>(_app: tauri::AppHandle<R>, _window: tauri::Window<R>, config: String) {
    thread::spawn(move || {
        if !leaf::is_running(0) {
            let options = leaf::StartOptions {
                config: leaf::Config::Str(config),
                runtime_opt: leaf::RuntimeOption::SingleThread,
            };
            if let Err(e) = leaf::start(0, options) {
                eprintln!("start error: {}", e);
            }
        }
    });
}

#[tauri::command]
fn stop_leaf<R: Runtime>(_app: tauri::AppHandle<R>, _window: tauri::Window<R>) {
    thread::spawn(move || {
        if leaf::is_running(0) {
            let result = leaf::shutdown(0);
            println!("shutdown result: {}", result);
        }
    });
}

// is leaf running
#[tauri::command]
fn is_leaf_running<R: Runtime>(_app: tauri::AppHandle<R>, _window: tauri::Window<R>) -> bool {
    leaf::is_running(0)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_leaf, stop_leaf, is_leaf_running])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
