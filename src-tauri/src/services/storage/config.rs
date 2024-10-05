use std::{collections::HashMap, fs::File, error::Error};
use serde::{Serialize, Deserialize};

use sea_orm::{Database, DbBackend, IntoActiveModel, Schema, JsonValue, Statement};
use sea_orm::entity::prelude::*;
use sea_orm::sea_query::{OnConflict, SqliteQueryBuilder, TableCreateStatement};
use crate::services::STORAGE_PATH;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "config")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub name: String,
    pub value: JsonValue,
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
