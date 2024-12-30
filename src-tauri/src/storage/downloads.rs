use std::{error::Error, sync::Arc};
use serde::{Serialize, Deserialize};
use sea_orm::{Database, DbBackend, Schema, Set, Statement};
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

pub async fn insert(info: Arc<QueueInfo>) -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let name = info.id.clone();
    let info_unwrapped = Arc::try_unwrap(info).unwrap_or_else(|arc| (*arc).clone());
    let db_info = ActiveModel {
        name: Set(name.into()),
        value: Set(info_unwrapped)
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
        complete_queue.push_back(Arc::new(download.value));
    }
    Ok(())
}

pub async fn delete(id: Arc<String>) -> Result<(), Box<dyn Error>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display())).await?;
    let id_unwrapped = Arc::try_unwrap(id).unwrap_or_else(|arc| (*arc).clone());
    Entity::delete_many()
        .filter(Column::Name.eq(id_unwrapped))
        .exec(&db)
        .await?;

    Ok(())
}