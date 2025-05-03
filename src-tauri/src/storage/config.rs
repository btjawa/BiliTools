use anyhow::{anyhow, Context, Result};
use serde::{Serialize, Deserialize};
use std::collections::BTreeMap;
use serde_json::{Value, json};
use tauri::async_runtime;
use tauri_specta::Event;
use std::path::PathBuf;
use specta::Type;

use sea_orm::{
    Database, DbBackend, IntoActiveModel, JsonValue, Schema, Statement, FromJsonQueryResult,
    entity::prelude::*,
    sea_query::{
        TableCreateStatement,
        SqliteQueryBuilder,
        OnConflict,
    },
};

use crate::{shared::{
    get_app_handle, Theme, CONFIG, DATABASE_URL, SECRET
}, TauriResult};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "config")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub name: String,
    pub value: JsonValue,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult, Type, Event)]
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
    pub theme: Theme,
    pub language: String
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult, Type, Event)]
pub struct SettingsProxy {
    pub addr: String,
    pub username: String,
    pub password: String
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult, Type, Event)]
pub struct SettingsAdvanced {
    pub prefer_pb_danmaku: bool,
    pub filename_format: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn init() -> Result<()> {
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    let schema = Schema::new(DbBackend::Sqlite);
    let stmt: TableCreateStatement = schema.create_table_from_entity(Entity).if_not_exists().to_owned();
    db.execute(Statement::from_string(
        DbBackend::Sqlite, 
        stmt.to_string(SqliteQueryBuilder)
    )).await.context("Failed to init Config")?;
    Ok(())
}

pub async fn load() -> Result<BTreeMap<String, JsonValue>> {
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    let configs = Entity::find().all(&db)
        .await.context("Failed to load Settings")?;
    let mut result = BTreeMap::new();
    for config in configs {
        result.insert(config.name, config.value);
    }
    Ok(result)
}

pub async fn insert(name: String, value: JsonValue) -> Result<()> {
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    Entity::insert(Model { name: name.clone(), value }.into_active_model())
        .on_conflict(
        OnConflict::column(Column::Name)
            .update_columns([Column::Value])
            .to_owned())
        .exec(&db).await
        .with_context(|| format!("Failed to insert Setting: {:?}", &name))?;

    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn rw_config(action: &str, settings: Option<BTreeMap<String, Value>>, secret: String) -> TauriResult<()> {
    if secret != *SECRET.read().unwrap() {
        return Err(anyhow!("403 Forbidden").into());
    }
    let update_config = |source: BTreeMap<String, Value>| {
        let mut config = CONFIG.write().unwrap();
        let mut config_json = serde_json::to_value(&*config)?;
        if let Value::Object(ref mut config_obj) = config_json {
            for (key, value) in source {
                if let (Some(Value::Object(original)), Value::Object(new)) = (config_obj.get_mut(&key), &value) {
                    for (_key, _value) in new {
                        original.insert(_key.clone(), _value.clone());
                    }
                    let merged = json!(original);
                    async_runtime::spawn(async move {
                        let _ = insert(key, merged).await;
                    });
                } else {
                    config_obj.insert(key.clone(), value.clone());
                    async_runtime::spawn(async move {
                        let _ = insert(key, value).await;
                    });
                }
            }
        }
        *config = serde_json::from_value(config_json)?;
        Ok::<(), anyhow::Error>(())
    };
    if action == "init" || action == "read" {
        update_config(load().await?)?;
    } else if action == "write" {
        if let Some(new_config) = settings {
            update_config(new_config.clone())?;
        }
    }
    let config = CONFIG.read().unwrap().clone();
    if action != "read" {
        if let Value::Object(map) = serde_json::to_value(&config).unwrap() {
            update_config(map.into_iter().collect::<BTreeMap<String, Value>>())?;
        }
        #[cfg(debug_assertions)]
        log::info!("{:?}", config);
    }
    config.emit(&get_app_handle()).unwrap();
    Ok(())
}