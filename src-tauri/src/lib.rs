mod window;

/// Builds and runs the Mochi app.
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let window = window::create(app.handle())?;
            window.show()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Mochi failed to start");
}
