use serde::{Serialize, Deserialize};
use anyhow::{Context, Result};
use serde_json::{json, Value};
use tokio::sync::RwLock;
use std::{collections::HashMap, sync::Arc};

use sea_orm::{
    Database, DbBackend, Schema, Set, Statement,
    entity::prelude::*,
    sea_query::{
        TableCreateStatement,
        SqliteQueryBuilder
    },
};

use crate::{
    commands::queue::QUEUE_MANAGER, queue::GeneralTask, shared::DATABASE_URL
};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Data {
    status: Arc<Value>,
    task: Arc<GeneralTask>
}

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "archive")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    name: String,
    value: Value,
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
    )).await.context("Failed to init Archive")?;
    Ok(())
}

pub async fn load() -> Result<(Vec<Arc<String>>, HashMap<Arc<String>, Arc<GeneralTask>>, HashMap<Arc<String>, Arc<Value>>)> {
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    let archives = Entity::find().all(&db)
        .await.context("Failed to load archives")?;

    let mut complete = vec![];
    let mut tasks = HashMap::new();
    let mut status = HashMap::new();
    let mut tasks_guard = QUEUE_MANAGER.tasks.write().await;
    let mut complete_guard = QUEUE_MANAGER.complete.write().await;

    for archive in archives {
        let data = serde_json::from_value::<Data>(archive.value)?;
        let id = data.task.id.clone();
        let task = data.task.clone();
        complete.push(id.clone());
        tasks.insert(id.clone(), data.task.clone());
        status.insert(id.clone(), data.status);

        complete_guard.push_back(id.clone());
        tasks_guard.insert(id.clone(), Arc::new(RwLock::new((*task).clone())));
    }
    Ok((complete, tasks, status))
}

pub async fn insert(task: Arc<GeneralTask>, status: Arc<Value>) -> Result<()> {
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    let id = (&*task.id).clone();
    let db_info = ActiveModel {
        name: Set(id),
        value: Set(json!(Data {
            task,
            status
        }))
    };
    db_info.insert(&db).await?;
    Ok(())
}

pub async fn delete(id: String) -> Result<()> {
    let db = Database::connect(&*DATABASE_URL)
        .await.context("Failed to connect to the database")?;
    Entity::delete_many()
        .filter(Column::Name.eq(&id))
        .exec(&db).await?;

    Ok(())
}