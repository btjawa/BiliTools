use anyhow::Result;
use sea_query::{
    ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_query_binder::SqlxBinder;
use serde::Serialize;
use sqlx::Row;
use std::collections::HashMap;

use crate::{
    queue::{
        atomics::TaskState,
        manager::MANAGER,
        task::{SubTaskStatus, Task, TaskHotData, TaskPrepare, TaskView},
    },
    shared::get_millis,
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

pub async fn load() -> Result<HashMap<String, TaskView>> {
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

    let mut map = HashMap::new();
    let mut tasks = MANAGER.tasks.write().await;
    tasks.clear();

    for r in rows {
        let id = r.try_get::<String, _>("name")?;
        let meta = serde_json::from_str(&r.try_get::<String, _>("meta")?)?;
        let prepare = serde_json::from_str(&r.try_get::<String, _>("prepare")?)?;
        let status = serde_json::from_str(&r.try_get::<String, _>("status")?)?;

        let mut state = r.try_get::<u8, _>("state")?;

        if state == TaskState::Active as u8 {
            state = TaskState::Paused as u8;
        }

        let view = TaskView {
            meta,
            prepare,
            hot: TaskHotData {
                status,
                state: state.into(),
            },
        };

        map.insert(id.clone(), view.clone());

        let task = Task::new(view);
        task.init().await?;

        tasks.insert(id, task);
    }
    Ok(map)
}

pub async fn upsert(id: &str, value: &TaskView) -> Result<()> {
    let pool = get_db().await?;
    let now = get_millis();
    let (sql, values) = Query::insert()
        .into_table(Tasks::Table)
        .columns([
            Tasks::Name,
            Tasks::Meta,
            Tasks::Prepare,
            Tasks::Status,
            Tasks::State,
            Tasks::UpdatedAt,
        ])
        .values([
            id.into(),
            serde_json::to_string(&value.meta)?.into(),
            serde_json::to_string(&value.prepare)?.into(),
            serde_json::to_string(&value.hot.status)?.into(),
            (value.hot.state as u8).into(),
            now.into(),
        ])?
        .on_conflict(
            OnConflict::column(Tasks::Name)
                .update_columns([
                    Tasks::Name,
                    Tasks::Meta,
                    Tasks::Prepare,
                    Tasks::Status,
                    Tasks::State,
                    Tasks::UpdatedAt,
                ])
                .to_owned(),
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

pub async fn update<T: Serialize>(id: &str, col: Tasks, value: &T) -> Result<()> {
    let pool = get_db().await?;
    let now = get_millis();
    let val = serde_json::to_string(value)?;
    let (sql, values) = Query::update()
        .table(Tasks::Table)
        .values([(col, val.into()), (Tasks::UpdatedAt, now.into())])
        .and_where(Expr::col(Tasks::Name).eq(id))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

pub async fn update_prepare(id: &str, prepare: &TaskPrepare) -> Result<()> {
    update(id, Tasks::Prepare, &prepare).await?;
    Ok(())
}

pub async fn update_status(id: &str, status: &HashMap<String, SubTaskStatus>) -> Result<()> {
    update(id, Tasks::Status, status).await
}

pub async fn update_state(id: &str, state: u8) -> Result<()> {
    update(id, Tasks::State, &state).await
}

pub async fn delete(id: &str) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(Tasks::Table)
        .cond_where(Expr::col(Tasks::Name).eq(id))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}
