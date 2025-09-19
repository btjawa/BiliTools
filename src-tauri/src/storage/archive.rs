use anyhow::Result;
use sea_query::{
    ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_query_binder::SqlxBinder;
use sqlx::Row;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::{
    queue::{
        runtime::TASK_MANAGER,
        types::{Task, TaskState},
    },
    shared::get_ts,
};

use super::db::{get_db, TableSpec};

#[derive(Iden)]
pub enum Archive {
    Table,
    Name,
    Value,
    UpdatedAt,
}

pub struct ArchiveTable;

impl TableSpec for ArchiveTable {
    const NAME: &'static str = "archive";
    const LATEST: i32 = 2;
    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(Archive::Table)
            .col(
                ColumnDef::new(Archive::Name)
                    .text()
                    .not_null()
                    .primary_key(),
            )
            .col(ColumnDef::new(Archive::Value).text().not_null())
            .col(ColumnDef::new(Archive::UpdatedAt).integer().not_null())
            .to_owned()
    }
}

pub async fn load() -> Result<()> {
    let (sql, values) = Query::select()
        .columns([Archive::Value])
        .from(Archive::Table)
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;
    {
        TASK_MANAGER.tasks.write().await.clear();
    }
    for r in rows {
        let mut v: Task = serde_json::from_str(&r.try_get::<String, _>("value")?)?;
        if v.state == TaskState::Active {
            v.state = TaskState::Paused
        }
        let id = v.id.clone();
        let mut guard = TASK_MANAGER.tasks.write().await;
        guard.insert(id.clone(), Arc::new(RwLock::new(v.clone())));
        drop(guard);
    }
    Ok(())
}

pub async fn upsert(task: &Task) -> Result<()> {
    let pool = get_db().await?;
    let now = get_ts(true);
    let name = (*task.id).clone();
    let value = serde_json::to_string(task)?;
    let (sql, values) = Query::insert()
        .into_table(Archive::Table)
        .columns([Archive::Name, Archive::Value, Archive::UpdatedAt])
        .values_panic([name.into(), value.into(), now.into()])
        .on_conflict(
            OnConflict::column(Archive::Name)
                .update_columns([Archive::Value, Archive::UpdatedAt])
                .to_owned(),
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;

    Ok(())
}

pub async fn delete(name: &str) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(Archive::Table)
        .cond_where(Expr::col(Archive::Name).eq(name))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}
