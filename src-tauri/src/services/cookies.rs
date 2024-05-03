use std::{collections::HashMap, error::Error};
use regex::Regex;
use serde::{Serialize, Deserialize};
use tauri::{Manager, Wry};
use tauri_plugin_store::{with_store, StoreCollection, JsonValue};

use crate::init_headers;
use super::{get_app_handle, COOKIE_PATH};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CookieInfo {
    pub name: String,
    pub value: String,
    pub path: String,
    pub domain: String,
    pub expires: String,
}

pub fn parse_cookie_header(cookie_str: &str) -> Result<CookieInfo, &'static str> {
    let re = Regex::new(r"(?i)(?P<name>\w+)=(?P<value>[^;]+)").unwrap();
    let captures = re.captures(cookie_str).ok_or("Invalid cookie header")?;
    let name = captures.name("name").unwrap().as_str();
    let value = captures.name("value").unwrap().as_str();
    let mut path = "";
    let mut domain = "";
    let mut expires = "";
    for part in cookie_str.split(';').skip(1) {
        let mut iter = part.splitn(2, '=').map(str::trim);
        if let Some(key) = iter.next() {
            if let Some(value) = iter.next() {
                match key.to_lowercase().as_str() {
                    "path" => path = value,
                    "domain" => domain = value,
                    "expires" => expires = value,
                    _ => {}
                }
            }
        }
    }
    Ok(CookieInfo {
        name: name.to_string(),
        value: value.to_string(),
        path: path.to_string(),
        domain: domain.to_string(),
        expires: expires.to_string(),
    })
}

pub fn load() -> Result<HashMap<String, JsonValue>, Box<dyn Error>> {
    let app_handle = get_app_handle().unwrap();
    let stores = app_handle.state::<StoreCollection<Wry>>();
    return Ok(with_store(app_handle.clone(), stores, &*COOKIE_PATH, |store| {
        Ok(store.entries().map(|(k, v)| (k.clone(), v.clone()))
        .collect::<HashMap<String, JsonValue>>())
    })?)
}

pub fn insert(cookie_str: &str) -> Result<(), Box<dyn Error>> {
    let app_handle = get_app_handle().unwrap();
    let parsed_cookie = parse_cookie_header(cookie_str).unwrap();
    let stores = app_handle.state::<StoreCollection<Wry>>();
    with_store(app_handle.clone(), stores, &*COOKIE_PATH, |store| {
        store.insert(
            parsed_cookie.name,
            parsed_cookie.value.into()
        )?;
        store.save()?;
        Ok(())
    })?;
    app_handle.get_webview_window("main").unwrap().emit("headers", init_headers()).unwrap();
    return Ok(())
}

pub fn delete(key: String) -> Result<(), Box<dyn Error>> {
    let app_handle = get_app_handle().unwrap();
    let stores = app_handle.state::<StoreCollection<Wry>>();
    with_store(app_handle.clone(), stores, &*COOKIE_PATH, |store| {
        store.delete(key)?;
        store.save()?;
        Ok(())
    })?;
    app_handle.get_webview_window("main").unwrap().emit("headers", init_headers()).unwrap();
    return Ok(())
}
