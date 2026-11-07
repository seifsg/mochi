use tauri::{tray::TrayIconBuilder, AppHandle, Emitter, Manager};

use crate::{menu::MochiMenu, mute::Mute};

/// UI event: show a tip now (menu item or a second launch).
pub const TIP_NOW: &str = "tray://tip-now";
/// UI event: mute changed (payload: bool), so an open bubble hides at once.
pub const MUTED: &str = "tray://muted";

const TRAY_ID: &str = "mochi";

/// Builds the tray icon with Mochi's menu (choices are handled in `menu::on_event`).
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| tauri::Error::AssetNotFound("app icon".into()))?;
    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .tooltip(tooltip(app.state::<Mute>().is_on()))
        .menu(&app.state::<MochiMenu>().menu)
        .build(app)?;
    Ok(())
}

/// Tray tooltip text for the mute state.
fn tooltip(muted: bool) -> &'static str {
    if muted {
        "Mochi (muted)"
    } else {
        "Mochi"
    }
}

/// Keeps the tray tooltip in step with mute.
pub fn show_muted(app: &AppHandle, muted: bool) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray
            .set_tooltip(Some(tooltip(muted)))
            .inspect_err(|e| log::warn!("tooltip: {e}"));
    }
}

/// Sends an event to the UI; a failure is logged (the UI also reads mute on its next poll).
pub fn emit<S: serde::Serialize + Clone>(app: &AppHandle, event: &str, payload: S) {
    if let Err(e) = app.emit(event, payload) {
        log::error!("could not send {event}: {e}");
    }
}
