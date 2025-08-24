use sea_query::{ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement};
use std::{collections::HashMap, sync::Arc};
use sea_query_binder::SqlxBinder;
use tokio::sync::RwLock;
use serde_json::Value;
use anyhow::Result;
use sqlx::Row;

use crate::{commands::{queue::runtime::QUEUE_MANAGER, GeneralTask}, storage::db::get_db};

use super::db::TableSpec;

#[derive(Iden)]
pub enum Archive {
    Table,
    Name,
    Task,
    Status,
}

pub struct ArchiveTable;

impl TableSpec for ArchiveTable {
    const NAME: &'static str = "archive";
    const LATEST: i32 = 1;
    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(Archive::Table)
            .col(ColumnDef::new(Archive::Name)
                .text().not_null().primary_key()
            )
            .col(ColumnDef::new(Archive::Task)
                .text().not_null()
            )
            .col(ColumnDef::new(Archive::Status)
                .text().not_null()
            )
            .to_owned()
    }
}

pub async fn load() -> Result<(
    HashMap<Arc<String>, Arc<GeneralTask>>,
    HashMap<Arc<String>, Arc<Value>>,
)> {
    let (sql, values) = Query::select()
        .columns([Archive::Task, Archive::Status])
        .from(Archive::Table)
        .build_sqlx(SqliteQueryBuilder);

    let rows = sqlx::query_with(&sql, values).fetch_all(&get_db()?).await?;
    
    let mut tasks = HashMap::with_capacity(rows.len());
    let mut status = HashMap::with_capacity(rows.len());
    let mut tasks_guard = QUEUE_MANAGER.tasks.write().await;
    let mut complete_guard = QUEUE_MANAGER.complete.write().await;
    for r in rows {
        let t: Arc<GeneralTask> = serde_json::from_str(
            &r.try_get::<String, _>("task")?
        )?;
        let s: Arc<Value> = serde_json::from_str(
            &r.try_get::<String, _>("status")?
        )?;
        let id = t.id.clone();
        tasks.insert(id.clone(), t.clone());
        status.insert(id.clone(), s);
        complete_guard.push_back(id.clone());
        tasks_guard.insert(id.clone(), Arc::new(RwLock::new((*t).clone())));
    }
    drop(tasks_guard);
    drop(complete_guard);
    QUEUE_MANAGER.emit().await;
    Ok((tasks, status))
}

pub async fn insert(task: Arc<GeneralTask>, status: Arc<Value>) -> Result<()> {
    let name = (&*task.id).clone();
    let task = serde_json::to_string(&task)?;
    let status = serde_json::to_string(&status)?;
    let (sql, values) = Query::insert()
        .into_table(Archive::Table)
        .columns([Archive::Name, Archive::Task, Archive::Status])
        .values_panic([name.into(), task.into(), status.into()])
        .on_conflict(
            OnConflict::column(Archive::Name)
                .update_columns([Archive::Task, Archive::Status])
                .to_owned()
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&get_db()?).await?;
    Ok(())
}

pub async fn delete(id: String) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(Archive::Table)
        .cond_where(Expr::col(Archive::Name).eq(&id))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&get_db()?).await?;
    Ok(())
}