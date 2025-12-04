use tauri::{AppHandle, Manager, Runtime, WebviewWindow};

use log::{debug, error, info, warn};
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use std::{
    sync::atomic::{AtomicBool, Ordering},
    time::{Duration, Instant},
};

/// Window operation result
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum WindowOperationResult {
    /// Window is shown and focused
    Shown,
    /// Window is hidden
    Hidden,
    /// Window destroyed
    Destroyed,
    /// Operation failed
    Failed,
    /// No action needed
    NoAction,
}

/// Window state
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum WindowState {
    /// Window is visible and focused
    VisibleFocused,
    /// Window is visible but unfocused
    VisibleUnfocused,
    /// Window is minimized
    Minimized,
    /// Window is hidden
    Hidden,
    /// Window does not exist
    NotExist,
}

// Window operation debounce mechanism
static WINDOW_OPERATION_DEBOUNCE: OnceCell<Mutex<Instant>> = OnceCell::new();
static WINDOW_OPERATION_IN_PROGRESS: AtomicBool = AtomicBool::new(false);
const WINDOW_OPERATION_DEBOUNCE_MS: u64 = 500;

fn get_window_operation_debounce() -> &'static Mutex<Instant> {
    WINDOW_OPERATION_DEBOUNCE.get_or_init(|| Mutex::new(Instant::now() - Duration::from_secs(1)))
}

fn should_handle_window_operation() -> bool {
    if WINDOW_OPERATION_IN_PROGRESS.load(Ordering::Acquire) {
        warn!("[Debounce] Window operation in progress, skipping duplicate call");
        return false;
    }

    let debounce_lock = get_window_operation_debounce();
    let mut last_operation = debounce_lock.lock();
    let now = Instant::now();
    let elapsed = now.duration_since(*last_operation);

    debug!(
        "[Debounce] Checking window operation interval: {}ms (required >= {}ms)",
        elapsed.as_millis(),
        WINDOW_OPERATION_DEBOUNCE_MS
    );

    if elapsed >= Duration::from_millis(WINDOW_OPERATION_DEBOUNCE_MS) {
        *last_operation = now;
        drop(last_operation);
        WINDOW_OPERATION_IN_PROGRESS.store(true, Ordering::Release);
        info!("[Debounce] Window operation allowed to execute");
        true
    } else {
        warn!("[Debounce] Window operation ignored by debounce, time since last operation {}ms < {}ms", elapsed.as_millis(), WINDOW_OPERATION_DEBOUNCE_MS);
        false
    }
}

fn finish_window_operation() {
    WINDOW_OPERATION_IN_PROGRESS.store(false, Ordering::Release);
}

// Global AppHandle storage
static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();

/// Unified window manager
pub struct WindowManager;

impl WindowManager {
    pub fn get_main_window_state<R: Runtime>(app: &AppHandle<R>) -> WindowState {
        match Self::get_main_window(app) {
            Some(window) => {
                let is_minimized = window.is_minimized().unwrap_or(false);
                let is_visible = window.is_visible().unwrap_or(false);
                let is_focused = window.is_focused().unwrap_or(false);

                if is_minimized {
                    return WindowState::Minimized;
                }

                if !is_visible {
                    return WindowState::Hidden;
                }

                if is_focused {
                    WindowState::VisibleFocused
                } else {
                    WindowState::VisibleUnfocused
                }
            }
            None => WindowState::NotExist,
        }
    }

    /// Get main window instance
    pub fn get_main_window<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
        app.get_webview_window("main")
    }

    /// Smartly show the main window
    pub async fn show_main_window<R: Runtime>(app: &AppHandle<R>) -> WindowOperationResult {
        // Debounce check
        if !should_handle_window_operation() {
            return WindowOperationResult::NoAction;
        }
        let _guard = scopeguard::guard((), |_| {
            finish_window_operation();
        });

        info!("Starting to intelligently show the main window");
        debug!("{}", Self::get_window_status_info(app));

        let current_state = Self::get_main_window_state(app);

        match current_state {
            WindowState::NotExist => {
                warn!("Window does not exist, creating a new window");
                error!("Window creation feature not yet implemented");
                WindowOperationResult::Failed
            }
            WindowState::VisibleFocused => {
                info!("Window is already visible and focused, no action needed");
                WindowOperationResult::NoAction
            }
            WindowState::VisibleUnfocused | WindowState::Minimized | WindowState::Hidden => {
                if let Some(window) = Self::get_main_window(app) {
                    let state_after_check = Self::get_main_window_state(app);
                    if state_after_check == WindowState::VisibleFocused {
                        info!("Window changed to visible and focused during check");
                        return WindowOperationResult::NoAction;
                    }
                    Self::activate_window(&window)
                } else {
                    WindowOperationResult::Failed
                }
            }
        }
    }

    /// Toggle main window visibility (show/hide)
    pub async fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) -> WindowOperationResult {
        // Debounce check
        if !should_handle_window_operation() {
            return WindowOperationResult::NoAction;
        }
        let _guard = scopeguard::guard((), |_| {
            finish_window_operation();
        });

        info!("Starting to toggle main window visibility");

        let current_state = Self::get_main_window_state(app);
        debug!(
            "Current window state: {:?} | Detailed state: {}",
            current_state,
            Self::get_window_status_info(app)
        );

        match current_state {
            WindowState::NotExist => {
                warn!("Window does not exist, will attempt to show window");
                Self::show_main_window(app).await
            }
            WindowState::VisibleFocused | WindowState::VisibleUnfocused => {
                Self::hide_main_window(app)
            }
            WindowState::Minimized | WindowState::Hidden => {
                Self::activate_existing_main_window(app)
            }
        }
    }

    // Hide the main window
    pub(crate) fn hide_main_window<R: Runtime>(app: &AppHandle<R>) -> WindowOperationResult {
        info!("Window is visible, will hide window");
        if let Some(window) = Self::get_main_window(app) {
            match window.hide() {
                Ok(_) => {
                    info!("Window successfully hidden");
                    WindowOperationResult::Hidden
                }
                Err(e) => {
                    error!("Failed to hide window: {}", e);
                    WindowOperationResult::Failed
                }
            }
        } else {
            error!("Failed to get window instance");
            WindowOperationResult::Failed
        }
    }

    // Activate existing main window
    fn activate_existing_main_window<R: Runtime>(app: &AppHandle<R>) -> WindowOperationResult {
        info!("Window exists but is hidden or minimized, activating window");
        if let Some(window) = Self::get_main_window(app) {
            Self::activate_window(&window)
        } else {
            error!("Failed to get window instance");
            WindowOperationResult::Failed
        }
    }

    /// Activate window (restore, show, and focus)
    fn activate_window<R: Runtime>(window: &WebviewWindow<R>) -> WindowOperationResult {
        info!("Starting to activate window");

        let mut operations_successful = true;

        // 1. If window is minimized, restore it first
        if window.is_minimized().unwrap_or(false) {
            info!("Window is minimized, restoring");
            if let Err(e) = window.unminimize() {
                error!("Failed to restore window: {}", e);
                operations_successful = false;
            }
        }

        // 2. Show window
        if let Err(e) = window.show() {
            error!("Failed to show window: {}", e);
            operations_successful = false;
        }

        // 3. Set focus
        if let Err(e) = window.set_focus() {
            error!("Failed to focus window: {}", e);
            operations_successful = false;
        }

        // 4. Platform-specific activation strategy
        #[cfg(target_os = "macos")]
        {
            debug!("Applying macOS specific activation strategy");
            // Note: In real Clash Verge Rev, this would call handle::Handle::global().set_activation_policy_regular()
            // But we don't have their handle system, so we'll skip this for now
        }

        #[cfg(target_os = "windows")]
        {
            // Windows: try additional activation methods
            if let Err(e) = window.set_always_on_top(true) {
                warn!("Failed to set always on top (non-critical): {}", e);
            }
            // Immediately unset always on top
            if let Err(e) = window.set_always_on_top(false) {
                warn!("Failed to unset always on top (non-critical): {}", e);
            }
        }

        if operations_successful {
            info!("Window activated successfully");
            WindowOperationResult::Shown
        } else {
            warn!("Window activation partially failed");
            WindowOperationResult::Failed
        }
    }

    /// Check if main window is visible
    pub fn is_main_window_visible<R: Runtime>(app: &AppHandle<R>) -> bool {
        Self::get_main_window(app)
            .map(|window| window.is_visible().unwrap_or(false))
            .unwrap_or(false)
    }

    /// Check if main window is focused
    pub fn is_main_window_focused<R: Runtime>(app: &AppHandle<R>) -> bool {
        Self::get_main_window(app)
            .map(|window| window.is_focused().unwrap_or(false))
            .unwrap_or(false)
    }

    /// Check if main window is minimized
    pub fn is_main_window_minimized<R: Runtime>(app: &AppHandle<R>) -> bool {
        Self::get_main_window(app)
            .map(|window| window.is_minimized().unwrap_or(false))
            .unwrap_or(false)
    }

    /// Destroy the window
    pub fn destroy_main_window<R: Runtime>(app: &AppHandle<R>) -> WindowOperationResult {
        if let Some(window) = Self::get_main_window(app) {
            let _ = window.destroy();
            info!("Window destroyed");
            #[cfg(target_os = "macos")]
            {
                debug!("Applying macOS specific activation strategy");
                // Note: In real Clash Verge Rev, this would call handle::Handle::global().set_activation_policy_accessory()
                // But we don't have their handle system, so we'll skip this for now
            }
            return WindowOperationResult::Destroyed;
        }
        WindowOperationResult::Failed
    }

    /// Get detailed window status information
    pub fn get_window_status_info<R: Runtime>(app: &AppHandle<R>) -> String {
        let state = Self::get_main_window_state(app);
        let is_visible = Self::is_main_window_visible(app);
        let is_focused = Self::is_main_window_focused(app);
        let is_minimized = Self::is_main_window_minimized(app);

        format!(
            "Window state: {state:?} | Visible: {is_visible} | Focused: {is_focused} | Minimized: {is_minimized}"
        )
    }
}
