use tauri::{AppHandle, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

/// Logical size of Mochi's window: bubble slot on top, mascot at the bottom.
const SIZE: (f64, f64) = (260.0, 300.0);
/// Gap kept from the right work-area edge on first launch.
const MARGIN: f64 = 16.0;

/// Creates Mochi's transparent, top-most, taskbar-free window that never steals focus.
/// It starts bottom-right; the window-state plugin then restores the last saved spot, if any.
pub fn create(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
        .title("Mochi")
        .inner_size(SIZE.0, SIZE.1)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false)
        .focusable(false)
        .visible(false);
    match bottom_right(app)? {
        Some((x, y)) => builder.position(x, y).build(),
        None => {
            log::warn!("no primary monitor; Mochi opens at the OS default spot");
            builder.build()
        }
    }
}

/// Logical top-left that puts the window at the bottom-right of the primary monitor's work area.
fn bottom_right(app: &AppHandle) -> tauri::Result<Option<(f64, f64)>> {
    let Some(monitor) = app.primary_monitor()? else {
        return Ok(None);
    };
    let scale = monitor.scale_factor();
    let area = monitor.work_area();
    let right = f64::from(area.position.x) + f64::from(area.size.width);
    let bottom = f64::from(area.position.y) + f64::from(area.size.height);
    Ok(Some((right / scale - SIZE.0 - MARGIN, bottom / scale - SIZE.1)))
}
