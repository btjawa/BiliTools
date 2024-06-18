use std::{collections::HashMap, fs::File, error::Error};
use regex::Regex;
use serde::{Serialize, Deserialize};

use sea_orm::{Database, DbBackend, IntoActiveModel, JsonValue, Schema, Statement};
use sea_orm::entity::prelude::*;
use sea_orm::sea_query::{OnConflict, SqliteQueryBuilder, TableCreateStatement};
use crate::services::STORAGE_PATH;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "cookies")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub name: String,
    pub value: String,
    pub path: String,
    pub domain: String,
    pub expires: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn init() -> Result<(), Box<dyn std::error::Error>> {
    if !STORAGE_PATH.exists() { File::create(&*STORAGE_PATH)?; }
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let schema = Schema::new(DbBackend::Sqlite);
    let stmt: TableCreateStatement = schema.create_table_from_entity(Entity).if_not_exists().to_owned();
    db.execute(Statement::from_string(
        DbBackend::Sqlite, 
        stmt.to_string(SqliteQueryBuilder)
    )).await?;
    Ok(())
}

fn parse_cookie_header(cookie_header: &str) -> Result<Model, Box<dyn Error>> {
    let re = Regex::new(r"([^=;]+)=([^;]*)")?;
    let mut cookie_map: HashMap<String, String> = HashMap::new();
    for cap in re.captures_iter(cookie_header) {
        let key = cap.get(1).map_or("", |m| m.as_str()).trim().to_string();
        let value = cap.get(2).map_or("", |m| m.as_str()).trim().to_string();
        cookie_map.insert(key.clone(), value);
    }
    let path = cookie_map.remove(&cookie_map.keys().find(|&k| k.to_lowercase() == "path").cloned().unwrap_or_else(|| String::new()))
        .unwrap_or_else(|| "/".into());
    let domain = cookie_map.remove(&cookie_map.keys().find(|&k| k.to_lowercase() == "domain").cloned().unwrap_or_else(|| String::new()))
        .unwrap_or_else(|| String::new());
    let expires = cookie_map.remove(&cookie_map.keys().find(|&k| k.to_lowercase() == "expires").cloned().unwrap_or_else(|| String::new()))
        .unwrap_or_else(|| String::new());
    let name = cookie_map.keys().next().ok_or("Missing cookie name")?.to_string();
    let value = cookie_map.get(&name).ok_or("Missing cookie value")?.to_string();
    Ok(Model {
        name,
        value,
        path,
        domain,
        expires,
    })
}

pub async fn load() -> Result<HashMap<String, JsonValue>, Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let cookies = Entity::find().all(&db).await?;
    let mut result = HashMap::new();
    for cookie in cookies {
        result.insert(cookie.name.clone(), serde_json::to_value(cookie)?);
    }
    Ok(result)
}

pub async fn insert(cookie_str: &str) -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let parsed_cookie = parse_cookie_header(cookie_str)?.into_active_model();
    Entity::insert(parsed_cookie)
        .on_conflict(
        OnConflict::column(Column::Name)
            .update_columns([Column::Value, Column::Path, Column::Domain, Column::Expires])
            .to_owned())
        .exec(&db)
        .await?;

    Ok(())
}

pub async fn delete(cookie_str: &str) -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let parsed_cookie = parse_cookie_header(cookie_str)?;
    Entity::delete_many()
        .filter(Column::Name.eq(parsed_cookie.name))
        .exec(&db)
        .await?;

    Ok(())
}
