use tauri::{
    menu::{CheckMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    AppHandle, Manager, WebviewWindow, Wry,
};
use tauri_plugin_autostart::ManagerExt;

use crate::{mute::Mute, tray};

const AUTOSTART_LABEL: &str = if cfg!(windows) {
    "Start with Windows"
} else {
    "Open at login"
};

/// Mochi's one menu, shared by the tray icon and a right-click on Mochi.
pub struct MochiMenu {
    pub menu: Menu<Wry>,
    mute: CheckMenuItem<Wry>,
    visibility: MenuItem<Wry>,
    autostart: CheckMenuItem<Wry>,
}

impl MochiMenu {
    /// Builds the menu: Show a tip, Mute tips, Hide Mochi, Start with Windows, Quit Mochi.
    pub fn build(app: &AppHandle) -> tauri::Result<Self> {
        let muted = app.state::<Mute>().is_on();
        let tip = MenuItem::with_id(app, "tip", "Show a tip", true, None::<&str>)?;
        let mute = CheckMenuItem::with_id(app, "mute", "Mute tips", true, muted, None::<&str>)?;
        let visibility = MenuItem::with_id(app, "visibility", "Hide Mochi", true, None::<&str>)?;
        let autostart = CheckMenuItem::with_id(
            app,
            "autostart",
            AUTOSTART_LABEL,
            true,
            autostart_on(app),
            None::<&str>,
        )?;
        let quit = MenuItem::with_id(app, "quit", "Quit Mochi", true, None::<&str>)?;
        let separator = PredefinedMenuItem::separator(app)?;
        let menu = Menu::with_items(
            app,
            &[&tip, &mute, &visibility, &autostart, &separator, &quit],
        )?;
        Ok(Self {
            menu,
            mute,
            visibility,
            autostart,
        })
    }
}

/// Handles every menu choice, from the tray or the right-click menu.
pub fn on_event(app: &AppHandle, event: MenuEvent) {
    let id = event.id().as_ref();
    log::info!("menu: {id}");
    let items = app.state::<MochiMenu>();
    match id {
        "tip" => wake(app),
        "mute" => set_mute(app, &items.mute),
        "visibility" => {
            let shown = main_window(app).is_some_and(|w| w.is_visible().unwrap_or(true));
            set_visible(app, &items, !shown);
        }
        "autostart" => toggle_autostart(app, &items.autostart),
        "quit" => app.exit(0),
        other => log::warn!("unknown menu item {other}"),
    }
}

/// Shows Mochi (if hidden) and asks for a tip: the "Show a tip" item and a second launch.
pub fn wake(app: &AppHandle) {
    set_visible(app, &app.state::<MochiMenu>(), true);
    tray::emit(app, tray::TIP_NOW, ());
}

/// UI command: opens Mochi's menu at the cursor (right-click on Mochi).
#[tauri::command]
pub fn open_menu(window: WebviewWindow, items: tauri::State<'_, MochiMenu>) -> Result<(), String> {
    window
        .popup_menu(&items.menu)
        .map_err(|e| format!("menu did not open: {e}"))
}

/// Mochi's window, if it exists.
fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

/// Shows or hides Mochi and keeps the menu label in step ("Hide Mochi" / "Show Mochi").
fn set_visible(app: &AppHandle, items: &MochiMenu, visible: bool) {
    let Some(window) = main_window(app) else {
        log::error!("Mochi window missing");
        return;
    };
    let result = if visible {
        window.show()
    } else {
        window.hide()
    };
    if let Err(e) = result {
        log::error!(
            "could not {} Mochi: {e}",
            if visible { "show" } else { "hide" }
        );
        return;
    }
    let label = if visible { "Hide Mochi" } else { "Show Mochi" };
    let _ = items
        .visibility
        .set_text(label)
        .inspect_err(|e| log::warn!("menu label: {e}"));
}

/// Applies the Mute check item (the menu already flipped it) to state, tooltip and UI.
fn set_mute(app: &AppHandle, item: &CheckMenuItem<Wry>) {
    let on = item.is_checked().unwrap_or_else(|e| {
        log::error!("mute item unreadable: {e}");
        app.state::<Mute>().is_on()
    });
    app.state::<Mute>().set(on);
    tray::show_muted(app, on);
    tray::emit(app, tray::MUTED, on);
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
