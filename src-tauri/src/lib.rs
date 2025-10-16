pub mod commands;
pub mod errors;
pub mod services;
pub mod shared;
pub mod storage;

use commands::*;
use tauri::Manager;
use tauri_specta::{collect_commands, collect_events, Builder};

#[cfg(debug_assertions)]
use tauri_plugin_log::fern::colors::{Color, ColoredLevelConfig};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    std::panic::set_hook(Box::new(|e| {
        let bt = std::backtrace::Backtrace::force_capture();
        log::error!("Panicked: {e}\n{bt:?}");
    }));
    let builder = Builder::<tauri::Wry>::new()
        // Then register them (separated by a comma)
        .commands(collect_commands![
            // Essentials
            meta,
            init,
            set_window,
            config_write,
            open_cache,
            get_size,
            clean_cache,
            db_import,
            db_export,
            export_data,
            // Login
            stop_login,
            exit,
            sms_login,
            pwd_login,
            switch_cookie,
            scan_login,
            refresh_cookie,
            // Queue
            ctrl_event,
            open_folder,
            submit_task,
            plan_scheduler,
            process_scheduler,
            // update_max_conc,
        ])
        .events(collect_events![
            shared::HeadersData,
            shared::ProcessError,
            queue::frontend::QueueEvent
        ]);

    #[cfg(debug_assertions)] // <- Only export on non-release builds
    builder
        .export(
            specta_typescript::Typescript::default()
                .bigint(specta_typescript::BigIntExportBehavior::Number)
                .header("// @ts-nocheck"),
            "../src/services/backend.ts",
        )
        .expect("Failed to export typescript bindings");

    let log_builder = tauri_plugin_log::Builder::new()
        .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
        .level(log::LevelFilter::Info)
        .level_for("sqlx::query", log::LevelFilter::Warn);

    #[cfg(debug_assertions)]
    let log_builder = log_builder.with_colors(
        ColoredLevelConfig::new()
            .error(Color::Red)
            .warn(Color::Yellow)
            .info(Color::Green)
            .debug(Color::Blue)
            .trace(Color::Magenta),
    );

    tauri::Builder::default()
        .plugin(log_builder.build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let windows = app.webview_windows();
            windows
                .values()
                .next()
                .expect("Sorry, no window found")
                .set_focus()
                .expect("Can't Bring Window to Focus");
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            let version = &app.package_info().version;
            log::info!("BiliTools v{}", version);
            builder.mount_events(app);
            shared::APP_HANDLE.set(app.app_handle().clone())?;
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }
            tauri::async_runtime::spawn(async move {
                storage::init().await?;
                services::init().await?;
                Ok::<_, crate::TauriError>(())
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running BiliTools");
    Ok(())
}
