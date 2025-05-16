use anyhow::{anyhow, Context, Result};
use serde::{Serialize, Deserialize};
use std::collections::BTreeMap;
use tauri_specta::Event;
use std::path::PathBuf;
use serde_json::Value;
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
    pub auto_download: bool,
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
    pub add_metadata: bool,
    pub filename_format: String,
    pub folder_format: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum ConfigAction {
    Init,
    Write
}

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

pub async fn load(db: &DatabaseConnection) -> Result<Vec<Model>> {
    Ok(Entity::find().all(db).await.context("Failed to load Settings")?)
}

pub async fn insert(db: &DatabaseConnection, name: String, value: JsonValue) -> Result<()> {
    Entity::insert(Model { name: name.clone(), value }.into_active_model())
        .on_conflict(
        OnConflict::column(Column::Name)
            .update_columns([Column::Value])
            .to_owned())
        .exec(db).await
        .with_context(|| format!("Failed to insert Setting: {:?}", &name))?;

    Ok(())
}

#[tauri::command(async)]
#[specta::specta]
pub async fn rw_config(action: ConfigAction, settings: Option<BTreeMap<String, Value>>, secret: String) -> TauriResult<()> {
    if secret != *SECRET.read().unwrap() {
        return Err(anyhow!("403 Forbidden").into());
    }
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    match action {
        ConfigAction::Init => {
            let local = load(&db).await?;
            let map = serde_json::to_value(&*CONFIG.read().unwrap())?
                .as_object().cloned().unwrap();

            let mut local: serde_json::Map<String, Value> = 
                local.into_iter().map(|Model { name, value }| (name, value)).collect();

            for (k, v) in map {
                if !local.contains_key(&k) {
                    local.insert(k.clone(), v.clone());
                    insert(&db, k, v).await?;
                } else if let (Value::Object(default), Value::Object(local)) = (v, local.get_mut(&k).unwrap()) {
                    for (k, v) in default {
                        if !local.contains_key(&k) {
                            local.insert(k, v);
                        }
                    }
                    insert(&db, k, Value::Object(local.clone())).await?;
                }
            }
            *CONFIG.write().unwrap() = serde_json::from_value(Value::Object(local))?;
        },
        ConfigAction::Write => {
            let mut map = serde_json::to_value(&*CONFIG.read().unwrap())?;
            let keys = map.as_object().map(|f|
                f.keys().cloned().collect::<Vec<String>>()
            ).unwrap();
            
            let update = settings.ok_or(anyhow!("No settings found for writing"))?
                .into_iter().filter(|(k, _)| keys.contains(k))
                .collect::<BTreeMap<_, _>>();

            map.as_object_mut().unwrap().extend(update.clone());
            for (k, v) in update {
                insert(&db, k, v).await?;
            }
            *CONFIG.write().unwrap() = serde_json::from_value(map)?;
        },
    }
    let config = CONFIG.read().unwrap();
    config.emit(&get_app_handle())?;
    #[cfg(debug_assertions)]
    log::info!("CONFIG: \n{}", serde_json::to_string_pretty(&*config)?);
    Ok(())
}