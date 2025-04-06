use serde::{Serialize, Deserialize};
use std::collections::BTreeMap;
use anyhow::{anyhow, Context, Result};
use regex::Regex;

use sea_orm::{
    Database, DbBackend, IntoActiveModel, Schema, Statement,
    entity::prelude::*,
    sea_query::{
        TableCreateStatement,
        SqliteQueryBuilder,
        OnConflict,
    },
};

use crate::shared::DATABASE_URL;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "cookies")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub name: String,
    pub value: String,
    pub path: Option<String>,
    pub domain: Option<String>,
    pub expires: Option<i64>,
    pub httponly: bool,
    pub secure: bool,
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
    )).await?;
    Ok(())
}

fn parse_cookie_header(cookie: String) -> Result<Model> {
    let re_name_value = Regex::new(r"^([^=]+)=([^;]+)")?;
    let re_attribute = Regex::new(r"(?i)\b(path|domain|expires|httponly|secure)\b(?:=([^;]*))?")?;
    let captures = re_name_value.captures(&cookie).context(anyhow!("Invalid Cookie"))?;
    let name = captures.get(1).unwrap().as_str().trim().into();
    let value = captures.get(2).unwrap().as_str().trim().into();
    let mut model = Model {
        name,
        value,
        path: None,
        domain: None,
        expires: None,
        httponly: false,
        secure: false
    };
    for cap in re_attribute.captures_iter(&cookie) {
        let key = cap.get(1).map_or("", |m| m.as_str().trim()).to_lowercase();
        let value = cap.get(2).map_or("", |m| m.as_str().trim()).to_string();
        match key.as_str() {
            "path" => model.path = Some(value),
            "domain" => model.domain = Some(value),
            "expires" => {
                let timestamp = chrono::NaiveDateTime::parse_from_str(
                    &value, "%a, %d %b %Y %H:%M:%S GMT"
                )?.and_utc().timestamp();
                model.expires = Some(timestamp);
            },
            "httponly" => model.httponly = true,
            "secure" => model.secure = true,
            _ => continue
        }
    }
    Ok(model)
}

pub async fn load() -> Result<BTreeMap<String, String>> {
    let mut result = BTreeMap::new();
    for cookie in load_raw().await? {
        result.insert(cookie.name, cookie.value);
    }
    Ok(result)
}

pub async fn load_raw() -> Result<Vec<Model>> {
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    Ok(Entity::find().all(&db).await.context("Failed to load Cookies")?)
}

pub async fn insert(cookie: String) -> Result<()> {
    let db = Database::connect(&*DATABASE_URL)
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
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    Entity::delete_many()
        .filter(Column::Name.eq(&name))
        .exec(&db).await
        .with_context(|| format!("Failed to delete Cookie: {}", name))?;

    Ok(())
}
