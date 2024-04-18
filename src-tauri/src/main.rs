#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri::Runtime;
use std::{fs::File, io::{self, BufRead, BufReader}, thread};

#[derive(Clone, Serialize)]
enum State {
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "start_success")]
    StartSuccess,
    #[serde(rename = "start_error")]
    StartError,
    #[serde(rename = "stop_success")]
    StopSuccess,
    #[serde(rename = "stop_error")]
    StopError,
    #[serde(rename = "not_running")]
    NotRunning
}

#[derive(Clone, Serialize)]
struct LeafResult {
    state: State,
    message: Option<String>
}

fn send_event<R: Runtime>(window: tauri::Window<R>, state: State, message: Option<String>) {
    window.emit("leaf_event", LeafResult {
        state,
        message,
    }).unwrap();
}

#[tauri::command]
async fn run_leaf<R: Runtime>(_app: tauri::AppHandle<R>, window: tauri::Window<R>, config: String) {
    thread::spawn(move || {
        if !leaf::is_running(0) {
            let options = leaf::StartOptions {
                config: leaf::Config::Str(config),
                runtime_opt: leaf::RuntimeOption::SingleThread,
            };
            match leaf::start(0, options) {
                Ok(_) => send_event(window, State::StopSuccess, None),
                Err(e) => send_event(window, State::StartError, Some(e.to_string())),
            };
        };
    });
}

#[tauri::command]
async fn stop_leaf<R: Runtime>(_app: tauri::AppHandle<R>, window: tauri::Window<R>) {
    thread::spawn(move || {
        if leaf::is_running(0) {
            if !leaf::shutdown(0) {
                send_event(window, State::StopError, None);
            };
        };
    });
}

#[tauri::command]
async fn is_leaf_running<R: Runtime>(_app: tauri::AppHandle<R>, window: tauri::Window<R>) {
    thread::spawn(move || {
        if leaf::is_running(0) {
            send_event(window, State::Running, None);
        } else {
            send_event(window, State::NotRunning, None);
        }
    });
}

fn main() {
    #[cfg(any(target_os="linux", target_os="macos"))]
    sudo::escalate_if_needed().unwrap();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_leaf, stop_leaf, is_leaf_running])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
