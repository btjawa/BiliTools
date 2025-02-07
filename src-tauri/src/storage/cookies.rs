use serde::{Serialize, Deserialize};
use std::collections::BTreeMap;
use anyhow::{anyhow, Context, Result};
use regex::Regex;

use sea_orm::{
    Database, DbBackend, IntoActiveModel, JsonValue, Schema, Statement,
    entity::prelude::*,
    sea_query::{
        TableCreateStatement,
        SqliteQueryBuilder,
        OnConflict,
    },
};

use crate::shared::STORAGE_PATH;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "cookies")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub name: String,
    pub value: JsonValue,
    pub expires: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn init() -> Result<()> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display()))
        .await.context("Failed to connect to the database")?;
    let schema = Schema::new(DbBackend::Sqlite);
    let stmt: TableCreateStatement = schema.create_table_from_entity(Entity).if_not_exists().to_owned();
    db.execute(Statement::from_string(
        DbBackend::Sqlite, 
        stmt.to_string(SqliteQueryBuilder)
    )).await?;
    Ok(())
}

fn parse_cookie_header(cookie: String) -> Result<Model> {
    let re_name_value = Regex::new(r"^([^=]+)=([^;]+);?")?;
    let re_attribute = Regex::new(r"([^=]+)=([^;]+);?")?;

    let captures = re_name_value.captures(&cookie).ok_or_else(|| anyhow!("Invalid Cookie"))?;
    let name = captures.get(1).unwrap().as_str().trim().to_string();
    let value: JsonValue = captures.get(2).unwrap().as_str().trim().into();

    let mut attributes: BTreeMap<String, String> = BTreeMap::new();

    for cap in re_attribute.captures_iter(&cookie) {
        let key = cap.get(1).unwrap().as_str().trim().to_string();
        let value = cap.get(2).unwrap().as_str().trim().to_string();
        attributes.insert(key, value);
    }

    let expires = attributes.get("Expires").cloned().unwrap_or_else(|| String::new());

    Ok(Model {
        name,
        value,
        expires,
    })
}

pub async fn load() -> Result<BTreeMap<String, JsonValue>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display()))
        .await.context("Failed to connect to the database")?;
    let cookies = Entity::find().all(&db)
        .await.context("Failed to load Cookies")?;
    let mut result = BTreeMap::new();
    for cookie in cookies {
        result.insert(cookie.name, cookie.value);
    }
    Ok(result)
}

pub async fn insert(cookie: String) -> Result<()> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display()))
        .await.context("Failed to connect to the database")?;
    let parsed_cookie = parse_cookie_header(cookie)?.into_active_model();
    let name = parsed_cookie.name.clone();
    Entity::insert(parsed_cookie)
        .on_conflict(
        OnConflict::column(Column::Name)
            .update_columns([Column::Value, Column::Expires])
            .to_owned())
        .exec(&db).await
        .with_context(|| format!("Failed to insert Cookie: {:?}", name))?;

    Ok(())
}

pub async fn delete(name: String) -> Result<()> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display()))
        .await.context("Failed to connect to the database")?;
    Entity::delete_many()
        .filter(Column::Name.eq(&name))
        .exec(&db).await
        .with_context(|| format!("Failed to delete Cookie: {}", name))?;

    Ok(())
}
