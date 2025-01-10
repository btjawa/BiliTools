use serde::{Serialize, Deserialize};
use anyhow::{Context, Result};
use std::sync::Arc;

use sea_orm::{
    Database, DbBackend, Schema, Set, Statement,
    entity::prelude::*,
    sea_query::{
        TableCreateStatement,
        SqliteQueryBuilder
    },
};

use crate::{
    aria2c::{
        QueueInfo, QueueType, QUEUE_MANAGER
    },
    shared::STORAGE_PATH
};

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

pub async fn init() -> Result<()> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display()))
        .await.context("Failed to connect to the database")?;
    let schema = Schema::new(DbBackend::Sqlite);
    let stmt: TableCreateStatement = schema.create_table_from_entity(Entity).if_not_exists().to_owned();
    db.execute(Statement::from_string(
        DbBackend::Sqlite, 
        stmt.to_string(SqliteQueryBuilder)
    )).await.context("Failed to init Downloads")?;
    Ok(())
}

pub async fn load() -> Result<Vec<Arc<QueueInfo>>> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display()))
        .await.context("Failed to connect to the database")?;
    let downloads = Entity::find().all(&db)
        .await.context("Failed to load QueueInfo")?;
    let infos: Vec<Arc<QueueInfo>> = downloads
        .into_iter()
        .map(|m| Arc::new(m.value))
        .collect();
    for info in &infos {
        QUEUE_MANAGER.push_back(info.clone(), QueueType::Complete).await?;
    }
    QUEUE_MANAGER.update(QueueType::Complete).await;
    Ok(infos)
}

pub async fn insert(info: Arc<QueueInfo>) -> Result<()> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display()))
        .await.context("Failed to connect to the database")?;
    let name = &info.clone().id;
    let db_info = ActiveModel {
        name: Set(name.into()),
        value: Set((*info).clone())
    };
    db_info.insert(&db).await
        .with_context(|| format!("Failed to insert Download: {}", name))?;
    Ok(())
}

pub async fn delete(id: String) -> Result<()> {
    let db = Database::connect(format!("sqlite://{}", STORAGE_PATH.display()))
        .await.context("Failed to connect to the database")?;
    Entity::delete_many()
        .filter(Column::Name.eq(&id))
        .exec(&db).await
        .with_context(|| format!("Failed to delete Download: {}", id))?;

    Ok(())
}