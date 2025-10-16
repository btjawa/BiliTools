use anyhow::Result;
use sea_query::{
    ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_query_binder::SqlxBinder;
use serde::Serialize;
use sqlx::Row;
use std::{path::PathBuf, sync::Arc};
use tokio::sync::RwLock;

use crate::{
    queue::{
        atomics::{Atomic, SchedulerState},
        manager::MANAGER,
        scheduler::Scheduler,
    },
    shared::get_ts,
};

use super::db::{get_db, TableSpec};

#[derive(Iden, Clone, Copy)]
pub enum Schedulers {
    Table,
    Name,
    CreatedAt,
    List,
    Queue,
    State,
    Folder,
    UpdatedAt,
}

pub struct SchedulersTable;

impl TableSpec for SchedulersTable {
    const NAME: &'static str = "schedulers";
    const LATEST: i32 = 3;
    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(Schedulers::Table)
            .col(
                ColumnDef::new(Schedulers::Name)
                    .text()
                    .not_null()
                    .primary_key(),
            )
            .col(ColumnDef::new(Schedulers::CreatedAt).integer().not_null())
            .col(ColumnDef::new(Schedulers::List).text().not_null())
            .col(ColumnDef::new(Schedulers::Queue).integer().not_null())
            .col(ColumnDef::new(Schedulers::State).integer().not_null())
            .col(ColumnDef::new(Schedulers::Folder).text().not_null())
            .col(ColumnDef::new(Schedulers::UpdatedAt).integer().not_null())
            .to_owned()
    }
}

pub async fn load() -> Result<()> {
    let (sql, values) = Query::select()
        .columns([
            Schedulers::Name,
            Schedulers::CreatedAt,
            Schedulers::List,
            Schedulers::Queue,
            Schedulers::State,
            Schedulers::Folder,
            Schedulers::UpdatedAt,
        ])
        .from(Schedulers::Table)
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;

    let mut schedulers = MANAGER.schedulers.write().await;
    schedulers.clear();

    for r in rows {
        let sid = Arc::new(r.try_get::<String, _>("name")?);

        let ts = r.try_get::<i64, _>("created_at")?;

        let list: Vec<Arc<String>> = serde_json::from_str(&r.try_get::<String, _>("list")?)?;

        let queue = r.try_get::<u8, _>("queue")?;
        let mut state = r.try_get::<u8, _>("state")?;

        if state == SchedulerState::Running as u8 {
            state = SchedulerState::Idle as u8;
        }

        let folder: Arc<PathBuf> = serde_json::from_str(&r.try_get::<String, _>("folder")?)?;

        let scheduler = Arc::new(Scheduler {
            sid: sid.clone(),
            ts,
            list: RwLock::new(list),
            queue: Atomic::new(queue.into()),
            state: Atomic::new(state.into()),
            folder,
        });
        schedulers.insert(sid, scheduler);
    }

    Ok(())
}

pub async fn update<T: Serialize>(id: &Arc<String>, name: Schedulers, value: &T) -> Result<()> {
    let pool = get_db().await?;
    let now = get_ts(true);
    let val = serde_json::to_string(value)?;
    let (sql, values) = Query::insert()
        .into_table(Schedulers::Table)
        .columns([Schedulers::Name, name, Schedulers::UpdatedAt])
        .values_panic([id.as_str().into(), val.into(), now.into()])
        .on_conflict(
            OnConflict::column(Schedulers::Name)
                .update_columns([name, Schedulers::UpdatedAt])
                .to_owned(),
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

pub async fn upsert(id: &Arc<String>, value: &Scheduler) -> Result<()> {
    update(id, Schedulers::Name, id).await?;
    update(id, Schedulers::CreatedAt, &value.ts).await?;
    update(
        id,
        Schedulers::List,
        &serde_json::to_string(&value.list.read().await.clone())?,
    )
    .await?;
    update(
        id,
        Schedulers::Folder,
        &value.folder.to_str().unwrap_or_default(),
    )
    .await?;
    update_queue(id, value.queue.get() as u8).await?;
    update_state(id, value.state.get() as u8).await?;
    Ok(())
}

pub async fn update_queue(id: &Arc<String>, queue: u8) -> Result<()> {
    update(id, Schedulers::Queue, &queue).await
}

pub async fn update_state(id: &Arc<String>, state: u8) -> Result<()> {
    update(id, Schedulers::State, &state).await
}

pub async fn delete(id: &Arc<String>) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(Schedulers::Table)
        .cond_where(Expr::col(Schedulers::Name).eq(id.as_str()))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}
