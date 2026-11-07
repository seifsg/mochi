mod context;
mod hit;
mod menu;
mod mute;
mod tray;
mod window;

use log::LevelFilter;
use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_window_state::StateFlags;

/// Logs to stdout and the app log folder; dev builds also keep the UI's debug lines (tip decisions).
fn logger() -> tauri_plugin_log::Builder {
    let base = tauri_plugin_log::Builder::new().level(LevelFilter::Info);
    if cfg!(debug_assertions) {
        base.level_for("webview", LevelFilter::Debug)
    } else {
        base
    }
}

/// Builds and runs the Mochi app.
pub fn run() {
    tauri::Builder::default()
        // First plugin: a second launch wakes the running Mochi instead of opening a twin.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            menu::wake(app);
        }))
        .plugin(logger().build())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::POSITION)
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .on_window_event(|window, event| match event {
            WindowEvent::Moved(origin) => window.state::<hit::HitMap>().moved(*origin),
            WindowEvent::ScaleFactorChanged { scale_factor, .. } => {
                window.state::<hit::HitMap>().rescaled(*scale_factor);
            }
            _ => {}
        })
        .on_menu_event(menu::on_event)
        .invoke_handler(tauri::generate_handler![
            context::context,
            hit::set_hit_rects,
            menu::open_menu
        ])
        .setup(|app| {
            let hits = hit::HitMap::default();
            app.manage(hits.clone());
            app.manage(mute::Mute::load(app.handle()));
            app.manage(menu::MochiMenu::build(app.handle())?);
            tray::create(app.handle())?;
            let window = window::create(app.handle())?;
            window.show()?;
            hit::watch(window, hits)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Mochi failed to start");
}
