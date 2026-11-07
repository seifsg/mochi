use serde::Serialize;
use tauri::State;

use crate::mute::Mute;

/// What Mochi senses each tick: idle seconds, the foreground app key (exe name, lowercase) and mute.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Sense {
    idle_secs: u64,
    app: Option<String>,
    muted: bool,
}

/// Reads user idle time and the foreground app; the UI polls it to decide when to speak.
#[tauri::command]
pub fn context(mute: State<'_, Mute>) -> Result<Sense, String> {
    let idle =
        user_idle::UserIdle::get_time().map_err(|e| format!("idle time unavailable: {e}"))?;
    Ok(Sense {
        idle_secs: idle.as_seconds(),
        app: foreground_app(),
        muted: mute.is_on(),
    })
}

/// Foreground app as its exe stem ("code", "excel"); None when there is none (lock screen) or it is Mochi.
fn foreground_app() -> Option<String> {
    let window = active_win_pos_rs::get_active_window().ok()?;
    if window.process_id == u64::from(std::process::id()) {
        return None;
    }
    Some(window.process_path.file_stem()?.to_str()?.to_lowercase())
}
