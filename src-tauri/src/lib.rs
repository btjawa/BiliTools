pub mod services;
pub mod storage;
pub mod shared;

use lazy_static::lazy_static;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use shared::{init_headers, APP_HANDLE, SECRET};
use tauri_plugin_shell::ShellExt;
use std::{collections::VecDeque, env, panic, path::PathBuf, sync::{Arc, RwLock}};
use tokio::fs;
use tauri::{async_runtime, Manager};
use walkdir::WalkDir;
use services::*;
use storage::*;

lazy_static! {
    static ref READY: Arc<RwLock<bool>> = Arc::new(RwLock::new(false));
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct InitData<'a> {
    downloads: VecDeque<Arc<aria2c::QueueInfo>>,
    hash: &'a str,
}

#[tauri::command]
async fn get_size(path: String, event: tauri::ipc::Channel<u64>) -> Result<(), String> {
    let mut bytes = 0u64;
    let mut count = 0;
    for entry in WalkDir::new(&path).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if path.is_file() {
            // let file_name = path.file_name().unwrap().to_str().unwrap();
            match fs::metadata(path).await {
                Ok(meta) => {
                    bytes += meta.len();
                    count += 1;
                    if count > 200 {
                        event.send(bytes).unwrap();
                        count = 0;
                    }
                },
                Err(_) => continue
            }
        }
    }
    event.send(bytes).unwrap();
    Ok(())
}

#[tauri::command]
async fn clean_cache(path: String) -> Result<(), String> {
    if path.ends_with("Storage") {
        let _ = fs::remove_file(&path).await;
    } else {
        let mut entries = fs::read_dir(&path).await.map_err(|e| e.to_string())?;
        while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
            let path = entry.path();
            if path.is_dir() {
                async_runtime::spawn(async move { let _ = fs::remove_dir_all(&path).await; });
            } else {
                async_runtime::spawn(async move { let _ = fs::remove_file(&path).await; });
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn write_binary(secret: String, path: String, contents: Vec<u8>) -> Result<(), String> {
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    fs::create_dir_all(PathBuf::from(&path).parent().unwrap()).await.map_err(|e| e.to_string())?;
    let mut _path = PathBuf::from(path);
    if _path.exists() {
        if let (Some(stem), Some(ext)) = (_path.file_stem(), _path.extension()) {
            _path.set_file_name(format!("{}_1.{}", stem.to_string_lossy(), ext.to_string_lossy()));
        }
    }
    fs::write(&_path, contents).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn xml_to_ass(app: tauri::AppHandle, secret: String, path: String, filename: String, contents: Vec<u8>) -> Result<(), String> {
    let input = {
        let config = shared::CONFIG.read().unwrap();
        config.temp_dir.join("com.btjawa.bilitools").join(format!("{filename}_{}.xml", shared::get_ts(true)))
    };
    write_binary(secret, input.to_string_lossy().into(), contents).await?;
    let output = app.shell().sidecar(format!("{}/DanmakuFactory", &*shared::BINARY_RELATIVE)).unwrap()
        .args(["-i", input.to_str().unwrap(), "-o", &path])
        .output().await.map_err(|e| e.to_string())?;

    log::info!("{:?}", String::from_utf8_lossy(&output.stdout));
    fs::remove_file(input).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn ready() -> Result<String, String> {
    #[cfg(not(debug_assertions))]
    if *READY.read().unwrap() {
        return Ok("403 Forbidden".into());
    }
    *READY.write().unwrap() = true;
    Ok(SECRET.read().unwrap().to_string())
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn init(secret: String) -> Result<InitData<'static>, Value> {
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    config::rw_config("read", None, secret).await?;
    login::stop_login();
    login::get_extra_cookies().await?;
    init_headers().await?;
    downloads::load().await.map_err(|e| e.to_string())?;
    let downloads = {
        let queue = aria2c::COMPLETE_QUEUE.read().await;
        queue.clone()
    };
    let hash = env!("GIT_HASH");
    Ok(InitData { downloads, hash })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    *SECRET.write().unwrap() = shared::random_string(10);
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
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let windows = app.webview_windows();
            windows.values().next().expect("Sorry, no window found")
            .set_focus().expect("Can't Bring Window to Focus");
        }))
        .setup(|app| {
            const VERSION: Option<&str> = option_env!("CARGO_PKG_VERSION");
            log::info!("BiliTools v{}", VERSION.unwrap_or("unknown"));
            panic::set_hook(Box::new(move |e| { e.to_string(); }));
            APP_HANDLE.set(app.app_handle().clone()).unwrap();
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
        .invoke_handler(tauri::generate_handler![
            ready, init, get_size, clean_cache, write_binary, xml_to_ass,
            login::exit, login::sms_login, login::pwd_login, login::switch_cookie, login::scan_login, login::refresh_cookie,
            config::rw_config,
            aria2c::push_back_queue, aria2c::process_queue, aria2c::post_aria2c, aria2c::remove_aria2c_task])
        .run(tauri::generate_context!())
        .expect("error while running BiliTools");
    Ok(())
}