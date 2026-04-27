use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use tauri::{Manager, State};

struct BackendProcess(Mutex<Option<Child>>);

#[tauri::command]
fn backend_status(process: State<BackendProcess>) -> bool {
    process.0.lock().expect("backend process lock poisoned").is_some()
}

pub fn run() {
    tauri::Builder::default()
        .manage(BackendProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![backend_status])
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| error.to_string())?;
            std::fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;

            let resource_dir = app
                .path()
                .resource_dir()
                .map_err(|error| error.to_string())?;
            let runtime_dir = resource_dir.join("desktop-runtime");
            let node_exe = runtime_dir.join("node").join("node.exe");
            let backend_dir = runtime_dir.join("backend");
            let backend_entry = backend_dir.join("start-backend-stack.mjs");

            let child = Command::new(node_exe)
                .arg(backend_entry)
                .current_dir(&backend_dir)
                .env("SWEETSTAR_DESKTOP", "1")
                .env("SWEETSTAR_APP_DATA_DIR", &app_data_dir)
                .env("SWEETSTAR_WORKSPACE_ROOT", &backend_dir)
                .env(
                    "STUDIO_ORIGIN",
                    "tauri://localhost,http://127.0.0.1:14273,http://localhost:5173",
                )
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|error| format!("failed to start desktop backend: {error}"))?;

            let state = app.state::<BackendProcess>();
            *state.0.lock().expect("backend process lock poisoned") = Some(child);

            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                let state = window.state::<BackendProcess>();
                let child = state.0.lock().expect("backend process lock poisoned").take();

                if let Some(mut child) = child {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
