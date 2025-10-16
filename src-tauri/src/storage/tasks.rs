use anyhow::Result;
use sea_query::{
    ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_query_binder::SqlxBinder;
use serde::Serialize;
use sqlx::Row;
use std::{collections::HashMap, sync::Arc};

use crate::{
    queue::{
        atomics::TaskState,
        manager::MANAGER,
        task::{SubTaskStatus, Task, TaskHotData, TaskMeta, TaskPrepare, TaskView},
    },
    shared::get_ts,
};

use super::db::{get_db, TableSpec};

#[derive(Iden, Clone, Copy)]
pub enum Tasks {
    Table,
    Name,
    Meta,
    Prepare,
    Status,
    State,
    UpdatedAt,
}

pub struct TasksTable;

impl TableSpec for TasksTable {
    const NAME: &'static str = "tasks";
    const LATEST: i32 = 1;
    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(Tasks::Table)
            .col(ColumnDef::new(Tasks::Name).text().not_null().primary_key())
            .col(ColumnDef::new(Tasks::Meta).text().not_null())
            .col(ColumnDef::new(Tasks::Prepare).text().not_null())
            .col(ColumnDef::new(Tasks::Status).text().not_null())
            .col(ColumnDef::new(Tasks::State).integer().not_null())
            .col(ColumnDef::new(Tasks::UpdatedAt).integer().not_null())
            .to_owned()
    }
}

pub async fn load() -> Result<()> {
    let (sql, values) = Query::select()
        .columns([
            Tasks::Name,
            Tasks::Meta,
            Tasks::Prepare,
            Tasks::Status,
            Tasks::State,
            Tasks::UpdatedAt,
        ])
        .from(Tasks::Table)
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;

    let mut tasks = MANAGER.tasks.write().await;
    tasks.clear();

    for r in rows {
        let id = Arc::new(r.try_get::<String, _>("name")?);
        let meta: Arc<TaskMeta> = serde_json::from_str(&r.try_get::<String, _>("meta")?)?;

        let prepare: Arc<TaskPrepare> = serde_json::from_str(&r.try_get::<String, _>("prepare")?)?;

        let status: HashMap<Arc<String>, Arc<SubTaskStatus>> =
            serde_json::from_str(&r.try_get::<String, _>("status")?)?;

        let mut state = r.try_get::<u8, _>("state")?;

        if state == TaskState::Active as u8 {
            state = TaskState::Paused as u8;
        }

        let view = TaskView {
            meta,
            prepare,
            hot: Arc::new(TaskHotData {
                status,
                state: state.into(),
            }),
        };

        tasks.insert(id, Task::new(view));
    }
    Ok(())
}

pub async fn update<T: Serialize>(id: &Arc<String>, name: Tasks, value: &T) -> Result<()> {
    let pool = get_db().await?;
    let now = get_ts(true);
    let val = serde_json::to_string(value)?;
    let (sql, values) = Query::insert()
        .into_table(Tasks::Table)
        .columns([Tasks::Name, name, Tasks::UpdatedAt])
        .values_panic([id.as_str().into(), val.into(), now.into()])
        .on_conflict(OnConflict::column(Tasks::Name).do_nothing().to_owned())
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

pub async fn upsert(id: &Arc<String>, value: &TaskView) -> Result<()> {
    update(id, Tasks::Meta, &value.meta).await?;
    update_prepare(id, &value.prepare).await?;
    update_status(id, &value.hot.status).await?;
    update_state(id, value.hot.state as u8).await?;
    Ok(())
}

pub async fn update_prepare(id: &Arc<String>, prepare: &Arc<TaskPrepare>) -> Result<()> {
    update(id, Tasks::Prepare, &prepare).await?;
    Ok(())
}

pub async fn update_status(
    id: &Arc<String>,
    status: &HashMap<Arc<String>, Arc<SubTaskStatus>>,
) -> Result<()> {
    update(id, Tasks::Status, status).await
}

pub async fn update_state(id: &Arc<String>, state: u8) -> Result<()> {
    update(id, Tasks::State, &state).await
}

pub async fn delete(id: &Arc<String>) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(Tasks::Table)
        .cond_where(Expr::col(Tasks::Name).eq(id.as_str()))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}
