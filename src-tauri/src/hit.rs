use std::{
    sync::{Arc, Mutex, MutexGuard},
    thread,
    time::Duration,
};

use serde::Deserialize;
use tauri::{PhysicalPosition, State, WebviewWindow};

/// How often the cursor is checked against Mochi's visible parts.
const TICK: Duration = Duration::from_millis(80);

/// A visible part of the UI (mascot, bubble) in CSS pixels, relative to the window.
#[derive(Clone, Copy, Deserialize)]
pub struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

impl Rect {
    fn contains(&self, x: f64, y: f64) -> bool {
        x >= self.x && x < self.x + self.w && y >= self.y && y < self.y + self.h
    }
}

/// Where the visible parts are on screen: rects from the UI, window origin and scale from window events.
#[derive(Default)]
struct Geometry {
    rects: Vec<Rect>,
    origin: PhysicalPosition<i32>,
    scale: f64,
}

/// Shared hit map; cached geometry keeps the 80 ms check to one cursor read (no window getters).
#[derive(Default, Clone)]
pub struct HitMap(Arc<Mutex<Geometry>>);

impl HitMap {
    fn lock(&self) -> MutexGuard<'_, Geometry> {
        self.0.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    /// Window moved (drag, restore): keep the cached origin current.
    pub fn moved(&self, origin: PhysicalPosition<i32>) {
        self.lock().origin = origin;
    }

    /// Monitor DPI changed: keep the cached scale current.
    pub fn rescaled(&self, scale: f64) {
        self.lock().scale = scale;
    }

    /// True when the screen point is over a visible part of Mochi.
    fn covers(&self, cursor: PhysicalPosition<f64>) -> bool {
        let g = self.lock();
        if g.scale <= 0.0 {
            return false;
        }
        let x = (cursor.x - f64::from(g.origin.x)) / g.scale;
        let y = (cursor.y - f64::from(g.origin.y)) / g.scale;
        g.rects.iter().any(|r| r.contains(x, y))
    }
}

/// UI command: replaces the visible parts (called when the bubble opens or closes).
#[tauri::command]
pub fn set_hit_rects(rects: Vec<Rect>, map: State<'_, HitMap>) {
    map.lock().rects = rects;
}

/// Makes transparent areas click-through: the window takes the cursor only while it is over a visible part.
pub fn watch(window: WebviewWindow, map: HitMap) -> tauri::Result<()> {
    map.moved(window.inner_position()?);
    map.rescaled(window.scale_factor()?);
    thread::spawn(move || {
        let mut ignoring = false;
        loop {
            thread::sleep(TICK);
            let over = match window.cursor_position() {
                Ok(cursor) => map.covers(cursor),
                Err(tauri::Error::WindowNotFound) => return,
                Err(e) => {
                    log::warn!("hit test skipped: {e}");
                    continue;
                }
            };
            if over == ignoring {
                ignoring = !over;
                if let Err(e) = window.set_ignore_cursor_events(ignoring) {
                    log::warn!("click-through toggle failed: {e}");
                }
            }
        }
    });
    Ok(())
}
