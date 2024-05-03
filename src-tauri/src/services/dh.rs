
use std::{collections::HashMap, error::Error, fs};
use serde_json::json;
use tauri::{Manager, Wry};
use tauri_plugin_store::{with_store, StoreCollection, JsonValue};

use super::{DH_PATH, get_app_handle};
use crate::{VideoInfo, COMPLETE_QUEUE};

pub async fn init() -> Result<(), String> {
    if !&DH_PATH.exists() {
        fs::write(&*DH_PATH, "{}").map_err(|e| e.to_string())?;
    }
    let app_handle = get_app_handle().unwrap();
    let stores = app_handle.state::<StoreCollection<Wry>>();
    let entries = with_store(app_handle.clone(), stores, &*DH_PATH, |store| {
        Ok(store.entries().map(|(k, v)| (k.clone(), v.clone()))
        .collect::<HashMap<String, JsonValue>>())
    }).map_err(|e| e.to_string())?;
    let mut complete_queue = COMPLETE_QUEUE.lock().await;
    complete_queue.clear();
    for (_, value) in entries {
        complete_queue.push_back(serde_json::from_value(value).unwrap());
    }
    Ok(())
}

pub async fn insert(info: VideoInfo) -> Result<(), Box<dyn Error>> {
    let app_handle = get_app_handle().unwrap();
    let stores = app_handle.state::<StoreCollection<Wry>>();
    with_store(app_handle.clone(), stores, &*DH_PATH, |store| {
        store.insert(info.display_name.clone().into(), json!({
            "gid": info.gid,
            "display_name": info.display_name,
            "path": json!(info.output_path),
            "tasks": json!(info.tasks),
            "action": info.action,
            "media_data": info.media_data
        }))?;
        store.save()?;
        Ok(())
    })?;
    Ok(())
}