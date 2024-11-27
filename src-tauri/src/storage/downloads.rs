
use std::error::Error;
use serde::{Serialize, Deserialize};
use sea_orm::{Database, DbBackend, Set, Schema, Statement};
use sea_orm::entity::prelude::*;
use sea_orm::sea_query::{TableCreateStatement, SqliteQueryBuilder};
use crate::{aria2c::{VideoInfo, COMPLETE_QUEUE}, services::STORAGE_PATH};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "downloads")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    name: String,
    value: VideoInfo,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn init() -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let schema = Schema::new(DbBackend::Sqlite);
    let stmt: TableCreateStatement = schema.create_table_from_entity(Entity).if_not_exists().to_owned();
    db.execute(Statement::from_string(
        DbBackend::Sqlite, 
        stmt.to_string(SqliteQueryBuilder)
    )).await?;
    load().await?;
    Ok(())
}

pub async fn insert(info: VideoInfo) -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let db_info = ActiveModel {
        name: Set(info.display_name.clone()),
        value: Set(info)
    };
    db_info.insert(&db).await?;
    Ok(())
}

pub async fn load() -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let downloads = Entity::find().all(&db).await?;
    let mut complete_queue = COMPLETE_QUEUE.lock().await;
    complete_queue.clear();
    for download in downloads {
        complete_queue.push_back(download.value);
    }
    Ok(())
}