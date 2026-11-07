use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, Wry,
};
use tauri_plugin_autostart::ManagerExt;

use crate::mute::Mute;

/// UI event: show a tip now (tray item or a second launch).
pub const TIP_NOW: &str = "tray://tip-now";
/// UI event: mute changed (payload: bool), so an open bubble hides at once.
pub const MUTED: &str = "tray://muted";

const AUTOSTART_LABEL: &str = if cfg!(windows) {
    "Start with Windows"
} else {
    "Open at login"
};

/// Builds the tray icon with its menu: Show a tip, Mute tips, Start with Windows, Quit Mochi.
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let muted = app.state::<Mute>().is_on();
    let tip = MenuItem::with_id(app, "tip", "Show a tip", true, None::<&str>)?;
    let mute = CheckMenuItem::with_id(app, "mute", "Mute tips", true, muted, None::<&str>)?;
    let autostart = CheckMenuItem::with_id(
        app,
        "autostart",
        AUTOSTART_LABEL,
        true,
        autostart_on(app),
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", "Quit Mochi", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &tip,
            &mute,
            &autostart,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;
    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| tauri::Error::AssetNotFound("app icon".into()))?;
    TrayIconBuilder::with_id("mochi")
        .icon(icon)
        .tooltip(tooltip(muted))
        .menu(&menu)
        .on_menu_event(move |app, event| {
            log::info!("tray: {}", event.id().as_ref());
            match event.id().as_ref() {
                "tip" => emit(app, TIP_NOW, ()),
                "mute" => set_mute(app, &mute),
                "autostart" => toggle_autostart(app, &autostart),
                "quit" => app.exit(0),
                other => log::warn!("unknown tray item {other}"),
            }
        })
        .build(app)?;
    Ok(())
}

fn tooltip(muted: bool) -> &'static str {
    if muted {
        "Mochi (muted)"
    } else {
        "Mochi"
    }
}

/// Sends an event to the UI; a failure is logged (the UI also reads mute on its next poll).
pub fn emit<S: serde::Serialize + Clone>(app: &AppHandle, event: &str, payload: S) {
    if let Err(e) = app.emit(event, payload) {
        log::error!("could not send {event}: {e}");
    }
}

/// Applies the Mute check item (the menu already flipped it) to state, tooltip and UI.
fn set_mute(app: &AppHandle, item: &CheckMenuItem<Wry>) {
    let on = item.is_checked().unwrap_or_else(|e| {
        log::error!("mute item unreadable: {e}");
        app.state::<Mute>().is_on()
    });
    app.state::<Mute>().set(on);
    if let Some(tray) = app.tray_by_id("mochi") {
        let _ = tray
            .set_tooltip(Some(tooltip(on)))
            .inspect_err(|e| log::warn!("tooltip: {e}"));
    }
    emit(app, MUTED, on);
}

/// Real autostart state from the OS; unknown counts as off and is logged.
fn autostart_on(app: &AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or_else(|e| {
        log::warn!("autostart state unknown: {e}");
        false
    })
}

/// Turns autostart on or off as the item asks, then shows the real OS state.
fn toggle_autostart(app: &AppHandle, item: &CheckMenuItem<Wry>) {
    let launcher = app.autolaunch();
    let want = item.is_checked().unwrap_or(false);
    let result = if want {
        launcher.enable()
    } else {
        launcher.disable()
    };
    if let Err(e) = result {
        log::error!(
            "could not turn autostart {}: {e}",
            if want { "on" } else { "off" }
        );
    }
    let _ = item
        .set_checked(autostart_on(app))
        .inspect_err(|e| log::warn!("autostart item: {e}"));
}
