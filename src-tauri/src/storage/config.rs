use sea_query::{ColumnDef, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::Arc};
use sea_query_binder::SqlxBinder;
use anyhow::{anyhow, Result};
use serde_json::Value;
use specta::Type;
use sqlx::Row;

use super::db::{get_db, TableSpec};
use crate::shared::{Theme, CONFIG};

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct Settings {
    pub add_metadata: bool,
    pub auto_check_update: bool,
    pub auto_download: bool,
    pub block_pcdn: bool,
    pub check_update: bool,
    pub clipboard: bool,
    pub default: SettingsDefault,
    pub down_dir: PathBuf,
    pub format: SettingsFormat,
    pub language: String,
    pub max_conc: usize,
    pub notify: bool,
    pub task_folder: bool,
    pub temp_dir: PathBuf,
    pub theme: Theme,
    pub proxy: SettingsProxy,
    pub convert: SettingsConvert,
}

impl Settings {
    pub fn temp_dir(&self) -> PathBuf {
        self.temp_dir.join("com.btjawa.bilitools")
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct SettingsProxy {
    pub address: String,
    pub username: String,
    pub password: String
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct SettingsDefault {
    pub res: usize,
    pub abr: usize,
    pub enc: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct SettingsFormat {
    pub series: String,
    pub item: String,
    pub file: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct SettingsConvert {
    pub danmaku: bool,
    pub mp3: bool,
}

#[derive(Iden)]
pub enum Config {
    Table,
    Name,
    Value
}

pub struct ConfigTable;

impl TableSpec for ConfigTable {
    const NAME: &'static str = "config";
    const LATEST: i32 = 1;
    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(Config::Table)
            .col(ColumnDef::new(Config::Name)
                .text().not_null().primary_key()
            )
            .col(ColumnDef::new(Config::Value)
                .text().not_null()
            )
            .to_owned()
    }
}

pub fn read() -> Arc<Settings> {
    CONFIG.load_full()
}

pub async fn load() -> Result<()> {
    let (sql, values) = Query::select()
        .columns([Config::Name, Config::Value])
        .from(Config::Table)
        .build_sqlx(SqliteQueryBuilder);

    let rows = sqlx::query_with(&sql, values).fetch_all(&get_db()?).await?;
    let mut local = serde_json::Map::new();
    for r in rows {
        let n: String = r.try_get("name")?;
        let v: Value = serde_json::from_str(
            &r.try_get::<String, _>("value")?
        )?;
        local.insert(n, v);
    }

    let map = serde_json::to_value(read())?
        .as_object().cloned().ok_or(anyhow!("Failed to read config"))?;
    for (k, v) in map {
        if !local.contains_key(&k) {
            insert(&k, &v).await?;
            local.insert(k, v);
        } else if let (
            Value::Object(default),
            Value::Object(local)
        ) = (
            v, local.get_mut(&k)
                .ok_or(anyhow!("Failed to get local config"))?
        ) {
            for (k, v) in default {
                if !local.contains_key(&k) {
                    local.insert(k, v);
                }
            }
            insert(&k, &Value::Object(local.to_owned())).await?;
        }
    }
    CONFIG.store(Arc::new(
        serde_json::from_value(Value::Object(local))?
    ));
    Ok(())
}

pub async fn insert(name: &str, value: &Value) -> Result<()> {
    let (sql, values) = Query::insert()
        .into_table(Config::Table)
        .columns([Config::Name, Config::Value])
        .values_panic([
            name.into(),
            serde_json::to_string(&value)?.into()
        ])
        .on_conflict(
            OnConflict::column(Config::Name)
                .update_columns([Config::Value])
                .to_owned()
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&get_db()?).await?;
    Ok(())
}

pub async fn write(settings: serde_json::Map<String, Value>) -> Result<()> {
    let mut map = serde_json::to_value(read())?;
    let keys = map.as_object().map(|v|
        v.keys().cloned().collect::<Vec<String>>()
    ).ok_or(anyhow!("Failed to read config"))?;

    let ftr = settings.into_iter().filter(|(k, _)| keys.contains(k));
    let obj = map.as_object_mut().ok_or(anyhow!("Failed to get mutable config"))?;

    for (k, v) in ftr {
        insert(&k, &v).await?;
        obj.insert(k, v);
    }
    CONFIG.store(Arc::new(
        serde_json::from_value(map)?
    ));

    #[cfg(debug_assertions)]
    log::info!("CONFIG: \n{}", serde_json::to_string_pretty(&read())?);
    Ok(())
}