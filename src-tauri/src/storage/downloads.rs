use std::error::Error;
use serde::{Serialize, Deserialize};
use sea_orm::{Database, DbBackend, Set, Schema, Statement};
use sea_orm::entity::prelude::*;
use sea_orm::sea_query::{TableCreateStatement, SqliteQueryBuilder};
use crate::{aria2c::{QueueInfo, COMPLETE_QUEUE}, shared::STORAGE_PATH};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "downloads")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    name: String,
    value: QueueInfo,
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

pub async fn insert(info: QueueInfo) -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let db_info = ActiveModel {
        name: Set(info.output.to_str().unwrap().into()),
        value: Set(info)
    };
    db_info.insert(&db).await?;
    Ok(())
}

pub async fn load() -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let downloads = Entity::find().all(&db).await?;
    let mut complete_queue = COMPLETE_QUEUE.write().await;
    complete_queue.clear();
    for download in downloads {
        complete_queue.push_back(download.value);
    }
    Ok(())
}