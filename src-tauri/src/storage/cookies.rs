use std::{collections::HashMap, error::Error};
use regex::Regex;
use serde::{Serialize, Deserialize};

use sea_orm::{Database, DbBackend, IntoActiveModel, JsonValue, Schema, Statement};
use sea_orm::entity::prelude::*;
use sea_orm::sea_query::{OnConflict, SqliteQueryBuilder, TableCreateStatement};
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

pub async fn init() -> Result<(), Box<dyn std::error::Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let schema = Schema::new(DbBackend::Sqlite);
    let stmt: TableCreateStatement = schema.create_table_from_entity(Entity).if_not_exists().to_owned();
    db.execute(Statement::from_string(
        DbBackend::Sqlite, 
        stmt.to_string(SqliteQueryBuilder)
    )).await?;
    Ok(())
}

fn parse_cookie_header(cookie: String) -> Result<Model, Box<dyn Error>> {
    let re_name_value = Regex::new(r"^([^=]+)=([^;]+);?")?;
    let re_attribute = Regex::new(r"([^=]+)=([^;]+);?")?;

    let captures = re_name_value.captures(&cookie).unwrap();
    let name = captures.get(1).unwrap().as_str().trim().to_string();
    let value: JsonValue = captures.get(2).unwrap().as_str().trim().into();

    let mut attributes: HashMap<String, String> = HashMap::new();

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

pub async fn load() -> Result<HashMap<String, JsonValue>, Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let cookies = Entity::find().all(&db).await?;
    let mut result = HashMap::new();
    for cookie in cookies {
        result.insert(cookie.name, cookie.value);
    }
    Ok(result)
}

pub async fn insert(cookie: String) -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let parsed_cookie = parse_cookie_header(cookie)?.into_active_model();
    Entity::insert(parsed_cookie)
        .on_conflict(
        OnConflict::column(Column::Name)
            .update_columns([Column::Value, Column::Expires])
            .to_owned())
        .exec(&db)
        .await?;

    Ok(())
}

pub async fn delete(cookie: String) -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    Entity::delete_many()
        .filter(Column::Name.eq(cookie))
        .exec(&db)
        .await?;

    Ok(())
}
