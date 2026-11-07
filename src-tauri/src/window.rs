use tauri::{AppHandle, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

/// Logical size of Mochi's window: bubble slot on top, mascot at the bottom.
const SIZE: (f64, f64) = (260.0, 300.0);
/// Gap kept from the work-area edge on first launch.
const MARGIN: i32 = 16;

/// Creates Mochi's transparent, top-most, taskbar-free window that never steals focus.
pub fn create(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
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
        .visible(false)
        .build()?;
    place_bottom_right(&window)?;
    Ok(window)
}

/// Default spot: bottom-right of the primary monitor's work area (window-state restores a saved spot over it).
fn place_bottom_right(window: &WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = window.primary_monitor()? else {
        log::warn!("no primary monitor; keeping the OS default position");
        return Ok(());
    };
    let area = monitor.work_area();
    let size = window.outer_size()?;
    let x = area.position.x + area.size.width as i32 - size.width as i32 - MARGIN;
    let y = area.position.y + area.size.height as i32 - size.height as i32;
    window.set_position(PhysicalPosition::new(x, y))
}
