use crate::{LATEST_CONNECTIVITY_STATE, LATEST_CORE_STATE, LATEST_LEAF_STATE};
use leaf_sdk_desktop::{ConnectivityState, CoreState, LeafState};
use log::info;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use tauri::image::Image;
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrayIconColor {
    Grey,
    Green,
    Red,
    Yellow,
}

pub static CURRENT_TRAY_ICON_COLOR: Lazy<Mutex<TrayIconColor>> =
    Lazy::new(|| Mutex::new(TrayIconColor::Grey));

impl TrayIconColor {
    const fn get_icon_bytes(&self) -> &'static [u8] {
        match self {
            TrayIconColor::Grey => include_bytes!("../icons/tray-grey.png"),
            TrayIconColor::Green => include_bytes!("../icons/tray-green.png"),
            TrayIconColor::Red => include_bytes!("../icons/tray-red.png"),
            TrayIconColor::Yellow => include_bytes!("../icons/tray-yellow.png"),
        }
    }

    pub fn to_image(&self) -> Result<Image<'static>, String> {
        let img_bytes = self.get_icon_bytes();
        let img = image::load_from_memory(img_bytes)
            .map_err(|e| format!("Failed to decode image: {}", e))?;

        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        let raw_data = rgba.into_raw();

        Ok(Image::new_owned(raw_data, width, height))
    }
}

pub fn determine_tray_icon_color() -> TrayIconColor {
    let core_state = LATEST_CORE_STATE.lock().clone();
    let leaf_state = LATEST_LEAF_STATE.lock().clone();
    let connectivity_state = LATEST_CONNECTIVITY_STATE.lock().clone();

    if let Some(CoreState::ERROR { .. }) = core_state {
        return TrayIconColor::Red;
    }

    if let Some(LeafState::ERROR { .. }) = leaf_state {
        return TrayIconColor::Red;
    }

    if let Some(LeafState::STARTED) = leaf_state {
        if let Some(ConnectivityState::LOST) = connectivity_state {
            return TrayIconColor::Yellow;
        }
        return TrayIconColor::Green;
    }

    TrayIconColor::Grey
}

pub fn update_tray_icon<R: Runtime>(app: &AppHandle<R>) {
    let new_color = determine_tray_icon_color();
    let mut current_color = CURRENT_TRAY_ICON_COLOR.lock();

    if *current_color != new_color {
        info!(
            "Updating tray icon color from {:?} to {:?}",
            *current_color, new_color
        );

        if let Some(tray) = app.tray_by_id("main") {
            match new_color.to_image() {
                Ok(icon) => {
                    if let Err(e) = tray.set_icon(Some(icon)) {
                        log::error!("Failed to set tray icon: {}", e);
                    } else {
                        *current_color = new_color;
                    }
                }
                Err(e) => {
                    log::error!("Failed to create icon image: {}", e);
                }
            }
        } else {
            log::error!("Tray icon 'main' not found");
        }
    }
}

pub fn init_tray_icon<R: Runtime>(app: &AppHandle<R>) {
    let initial_color = determine_tray_icon_color();
    *CURRENT_TRAY_ICON_COLOR.lock() = initial_color;

    info!("Initializing tray icon with color: {:?}", initial_color);

    if let Some(tray) = app.tray_by_id("main") {
        match initial_color.to_image() {
            Ok(icon) => {
                if let Err(e) = tray.set_icon(Some(icon)) {
                    log::error!("Failed to set initial tray icon: {}", e);
                }
            }
            Err(e) => {
                log::error!("Failed to create initial icon image: {}", e);
            }
        }
    }
}
