pub mod commands;
pub mod services;
pub mod storage;
pub mod shared;
pub mod errors;

use tauri_specta::{collect_commands, collect_events, Builder};
use tauri::{async_runtime, Manager};
use commands::*;

#[cfg(debug_assertions)]
use tauri_plugin_log::fern::colors::{Color, ColoredLevelConfig};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    std::panic::set_hook(Box::new(|e| {
        log::error!("Panicked: {}", e);
        println!("Panicked: {}", e);
        let backtrace = backtrace::Backtrace::new();
        log::error!("Backtrace:\n{:?}", backtrace);
        println!("Backtrace:\n{:?}", backtrace);
    }));
    *shared::SECRET.write().unwrap() = shared::random_string(10);

    let builder = Builder::<tauri::Wry>::new()
        // Then register them (separated by a comma)
        .commands(collect_commands![
            stop_login, exit, sms_login, pwd_login, switch_cookie, scan_login, refresh_cookie, // Login
            ready, init, init_login, set_window, config_write, get_size, clean_cache, // Essentials
            submit_task, process_queue, task_event, update_max_conc // Queue
        ])
        .events(collect_events![
            shared::Headers, shared::SidecarError, queue::QueueData
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
    let log_builder = log_builder
        .with_colors(
            ColoredLevelConfig::new()
                .error(Color::Red)
                .warn(Color::Yellow)
                .info(Color::Green)
                .debug(Color::Blue)
                .trace(Color::Magenta)
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
            windows.values().next().expect("Sorry, no window found")
            .set_focus().expect("Can't Bring Window to Focus");
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            let version = &app.package_info().version;
            log::info!("BiliTools v{}", version);
            builder.mount_events(app);
            let window = app.get_webview_window("main").unwrap();
            #[cfg(debug_assertions)]
            window.open_devtools();
            shared::set_window(window, shared::Theme::Auto).unwrap();
            shared::APP_HANDLE.set(app.app_handle().clone()).unwrap();
            async_runtime::spawn(async move {
                let _ = storage::init().await;
                let _ = services::init().await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running BiliTools");
    Ok(())
}