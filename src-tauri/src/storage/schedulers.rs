use anyhow::Result;
use sea_query::{
    ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_query_binder::SqlxBinder;
use serde::Serialize;
use sqlx::Row;
use std::{collections::HashMap, path::PathBuf, sync::Arc};
use tokio::sync::RwLock;

use crate::{
    queue::{
        atomics::{Atomic, SchedulerState},
        manager::MANAGER,
        scheduler::{Scheduler, SchedulerView},
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

pub async fn load() -> Result<HashMap<String, SchedulerView>> {
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

    let mut map = HashMap::new();
    let mut schedulers = MANAGER.schedulers.write().await;
    schedulers.clear();

    for r in rows {
        let sid = r.try_get::<String, _>("name")?;
        let ts = r.try_get::<i64, _>("created_at")?;
        let list: Vec<String> = serde_json::from_str(&r.try_get::<String, _>("list")?)?;

        let queue = r.try_get::<u8, _>("queue")?;
        let mut state = r.try_get::<u8, _>("state")?;

        if state == SchedulerState::Running as u8 {
            state = SchedulerState::Idle as u8;
        }

        let folder = PathBuf::from(&r.try_get::<String, _>("folder")?);

        let view = SchedulerView {
            sid: sid.clone(),
            ts,
            list: list.clone(),
            queue: queue.into(),
            state: queue.into(),
        };

        map.insert(sid.clone(), view);

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

    Ok(map)
}

pub async fn upsert(id: &str, value: &Scheduler) -> Result<()> {
    let pool = get_db().await?;
    let now = get_ts(true);
    let (sql, values) = Query::insert()
        .into_table(Schedulers::Table)
        .columns([
            Schedulers::Name,
            Schedulers::CreatedAt,
            Schedulers::List,
            Schedulers::Queue,
            Schedulers::State,
            Schedulers::Folder,
            Schedulers::UpdatedAt,
        ])
        .values([
            id.into(),
            value.ts.into(),
            serde_json::to_string(&value.list.read().await.clone())?.into(),
            (value.queue.get() as u8).into(),
            (value.state.get() as u8).into(),
            value.folder.to_str().unwrap_or_default().into(),
            now.into(),
        ])?
        .on_conflict(
            OnConflict::column(Schedulers::Name)
                .update_columns([
                    Schedulers::Name,
                    Schedulers::CreatedAt,
                    Schedulers::List,
                    Schedulers::Queue,
                    Schedulers::State,
                    Schedulers::Folder,
                    Schedulers::UpdatedAt,
                ])
                .to_owned(),
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

pub async fn update<T: Serialize>(id: &str, col: Schedulers, value: &T) -> Result<()> {
    let pool = get_db().await?;
    let now = get_ts(true);
    let val = serde_json::to_string(value)?;
    let (sql, values) = Query::update()
        .table(Schedulers::Table)
        .values([(col, val.into()), (Schedulers::UpdatedAt, now.into())])
        .and_where(Expr::col(Schedulers::Name).eq(id))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

pub async fn update_list(id: &str, list: &Vec<String>) -> Result<()> {
    update(id, Schedulers::List, list).await
}

pub async fn update_queue(id: &str, queue: u8) -> Result<()> {
    update(id, Schedulers::Queue, &queue).await
}

pub async fn update_state(id: &str, state: u8) -> Result<()> {
    update(id, Schedulers::State, &state).await
}

pub async fn delete(id: &str) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(Schedulers::Table)
        .cond_where(Expr::col(Schedulers::Name).eq(id))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}
