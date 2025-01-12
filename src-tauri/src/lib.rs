pub mod commands;
pub mod services;
pub mod storage;
pub mod shared;
pub mod errors;

use tauri_specta::{collect_commands, collect_events, Builder};
use tauri::{async_runtime, Manager};
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    std::panic::set_hook(Box::new(|e| {
        log::error!("Panicked: {}", e);
        println!("Panicked: {}", e);
    }));
    *shared::SECRET.write().unwrap() = shared::random_string(10);

    let builder = Builder::<tauri::Wry>::new()
        // Then register them (separated by a comma)
        .commands(collect_commands![
            stop_login, exit, sms_login, pwd_login, switch_cookie, scan_login, refresh_cookie, // Login
            ready, init, get_size, clean_cache, write_binary, xml_to_ass, rw_config, // Essentials
            push_back_queue, process_queue, toggle_pause, remove_task // Aria2c
        ])
        .events(collect_events![
            config::Settings, shared::Headers, services::aria2c::QueueEvent, services::aria2c::Notification
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

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new()
            .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::Webview,
            ))
            .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
            .level(log::LevelFilter::Info)
            .level_for("sqlx::query", log::LevelFilter::Warn)
        .build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let windows = app.webview_windows();
            windows.values().next().expect("Sorry, no window found")
            .set_focus().expect("Can't Bring Window to Focus");
        }))
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            const VERSION: Option<&str> = option_env!("CARGO_PKG_VERSION");
            log::info!("BiliTools v{}", VERSION.unwrap_or("unknown"));
            shared::APP_HANDLE.set(app.app_handle().clone()).unwrap();
            builder.mount_events(app);
            async_runtime::spawn(async move {
                storage::init().await.map_err(|e| e.to_string())?;
                services::init().await.map_err(|e| e.to_string())?;
                Ok::<(), String>(())
            });
            #[cfg(debug_assertions)]
            app.get_webview_window("main").unwrap().open_devtools();
            #[cfg(all(target_os = "windows", not(debug_assertions)))]
            let _ = app.get_webview_window("main").unwrap().with_webview(|webview| unsafe {
                use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings4;
                use windows::core::Interface;
                let core = webview.controller().CoreWebView2().unwrap();
                let settings = core.Settings().unwrap().cast::<ICoreWebView2Settings4>().unwrap();
                settings.SetAreBrowserAcceleratorKeysEnabled(false).unwrap();
                settings.SetIsGeneralAutofillEnabled(false).unwrap();
                settings.SetIsPasswordAutosaveEnabled(false).unwrap();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running BiliTools");
    Ok(())
}