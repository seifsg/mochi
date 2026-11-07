use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicBool, Ordering},
};
use tauri::{AppHandle, Manager};

/// Whether tips are muted; the single source of truth, kept across restarts as a marker file.
pub struct Mute {
    on: AtomicBool,
    marker: Option<PathBuf>,
}

impl Mute {
    /// Loads the saved state (marker file in the app config folder).
    pub fn load(app: &AppHandle) -> Self {
        let marker = app
            .path()
            .app_config_dir()
            .map(|dir| dir.join("muted"))
            .inspect_err(|e| log::warn!("no config folder, mute will not persist: {e}"))
            .ok();
        let on = marker.as_ref().is_some_and(|m| m.exists());
        Self {
            on: AtomicBool::new(on),
            marker,
        }
    }

    pub fn is_on(&self) -> bool {
        self.on.load(Ordering::Relaxed)
    }

    /// Sets the state and persists it; a failed write is logged, the in-memory state still applies.
    pub fn set(&self, on: bool) {
        self.on.store(on, Ordering::Relaxed);
        let Some(marker) = &self.marker else { return };
        let saved = if on {
            marker
                .parent()
                .map_or(Ok(()), fs::create_dir_all)
                .and_then(|()| fs::write(marker, b""))
        } else {
            fs::remove_file(marker).or_else(|e| {
                if e.kind() == std::io::ErrorKind::NotFound {
                    Ok(())
                } else {
                    Err(e)
                }
            })
        };
        if let Err(e) = saved {
            log::error!("could not save mute state to {}: {e}", marker.display());
        }
    }
}
