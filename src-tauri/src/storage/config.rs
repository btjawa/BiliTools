use std::{fs, path::PathBuf};
use std::{collections::HashMap, error::Error};
use serde::{Serialize, Deserialize};
use serde_json::Value;

use sea_orm::{Database, DbBackend, FromJsonQueryResult, IntoActiveModel, JsonValue, Schema, Statement};
use sea_orm::entity::prelude::*;
use sea_orm::sea_query::{OnConflict, SqliteQueryBuilder, TableCreateStatement};
use tauri::{Emitter, async_runtime};
use crate::shared::{STORAGE_PATH, SECRET, CONFIG, get_window};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "config")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub name: String,
    pub value: JsonValue,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct Settings {
    pub max_conc: usize,
    pub temp_dir: PathBuf,
    pub down_dir: PathBuf,
    pub df_dms: usize,
    pub df_ads: usize,
    pub df_cdc: usize,
    pub auto_check_update: bool,
    pub proxy: SettingsProxy,
    pub advanced: SettingsAdvanced,
    pub theme: tauri::Theme,
    pub language: String
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct SettingsProxy {
    pub addr: String,
    pub username: String,
    pub password: String
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct SettingsAdvanced {
    pub auto_convert_flac: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn init() -> Result<(), Box<dyn std::error::Error>> {
    if !STORAGE_PATH.exists() { fs::write(STORAGE_PATH.as_path(), &[])?; }
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let schema = Schema::new(DbBackend::Sqlite);
    let stmt: TableCreateStatement = schema.create_table_from_entity(Entity).if_not_exists().to_owned();
    db.execute(Statement::from_string(
        DbBackend::Sqlite, 
        stmt.to_string(SqliteQueryBuilder)
    )).await?;
    Ok(())
}

pub async fn load() -> Result<HashMap<String, JsonValue>, Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let configs = Entity::find().all(&db).await?;
    let mut result = HashMap::new();
    for config in configs {
        result.insert(config.name, config.value);
    }
    Ok(result)
}

pub async fn insert(name: String, value: JsonValue) -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    Entity::insert(Model { name, value }.into_active_model())
        .on_conflict(
        OnConflict::column(Column::Name)
            .update_columns([Column::Value])
            .to_owned())
        .exec(&db)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn rw_config(action: &str, settings: Option<HashMap<String, Value>>, secret: String) -> Result<&str, String> {
    let window = get_window();
    if secret != *SECRET.read().unwrap() {
        return Err("403 Forbidden".into())
    }
    let update_config = |source: HashMap<String, Value>| {
        let mut config = CONFIG.write().unwrap();
        let mut config_json = serde_json::to_value(&*config).unwrap();
        if let Value::Object(ref mut config_obj) = config_json {
            for (key, value) in source {
                config_obj.insert(key.clone(), value.clone());
                async_runtime::spawn(async move {
                    insert(key, value).await.map_err(|e| e.to_string()).unwrap();
                });
            }
        }
        *config = serde_json::from_value(config_json).map_err(|e| e.to_string()).unwrap();
    };
    if action == "init" || action == "read" {
        update_config(load().await.map_err(|e| e.to_string())?);
    } else if action == "write" {
        if let Some(new_config) = settings { update_config(new_config.clone()) }
    }
    let config = CONFIG.read().unwrap().clone();
    if action != "read" {
        if let Value::Object(map) = serde_json::to_value(&config).unwrap() {
            update_config(map.into_iter().collect::<HashMap<String, Value>>());
        }
        #[cfg(debug_assertions)]
        log::info!("{:?}", config)
    }
    window.emit("rw_config:settings", config).unwrap();
    Ok(action)
}