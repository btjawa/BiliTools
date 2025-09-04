use sea_query::{Alias, ColumnDef, Expr, Iden, Order, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement};
use std::{path::{PathBuf, Path}, str::FromStr, sync::Arc};
use sqlx::{Acquire, Row, SqliteConnection};
use sea_query_binder::SqlxBinder;
use anyhow::Result;

use crate::{
    queue::{
        runtime::{TASK_MANAGER, Scheduler},
        types::QueueType
    }, shared::get_ts
};

use super::db::{TableSpec, get_db};

pub const WAITING_SID: &str = "__waiting__";

#[derive(Iden)]
pub enum Schedulers {
    Table,
    Name,
    Queue,
    Seq,
    List,
    Folder,
    UpdatedAt,
}

pub struct ArchiveTable;

impl TableSpec for ArchiveTable {
    const NAME: &'static str = "schedulers";
    const LATEST: i32 = 1;
    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(Schedulers::Table)
            .col(ColumnDef::new(Schedulers::Name)
                .text().not_null().primary_key()
            )
            .col(ColumnDef::new(Schedulers::Queue)
                .text().not_null()
            )
            .col(ColumnDef::new(Schedulers::Seq)
                .integer().not_null()
            )
            .col(ColumnDef::new(Schedulers::List)
                .text().not_null()
            )
            .col(ColumnDef::new(Schedulers::Folder)
                .text().not_null()
            )
            .col(ColumnDef::new(Schedulers::UpdatedAt)
                .integer().not_null()
            )
            .to_owned()
    }
}

async fn next_seq(conn: &mut SqliteConnection, queue: &str) -> Result<i64> {
    let (sql, values) = Query::select()
        .expr_as(Expr::cust("COALESCE(MAX(seq), 0) + 1"), Alias::new("next"))
        .from(Schedulers::Table)
        .and_where(Expr::col(Schedulers::Queue).eq(queue))
        .build_sqlx(SqliteQueryBuilder);

    let row = sqlx::query_with(&sql, values).fetch_one(&mut *conn).await?;
    Ok(row.try_get::<i64, _>("next")?)
}

pub async fn upsert(
    sid: &str,
    queue: QueueType,
    list: &[Arc<String>],
    folder: &Path,
    seq: Option<i64>
) -> Result<i64> {
    let pool = get_db().await?;
    let mut tx = pool.begin().await?;
    let conn = tx.acquire().await?;

    let queue = queue.as_str();
    let now = get_ts(true);
    let list = serde_json::to_string(list)?;
    let seq = if let Some(seq) = seq {
        seq
    } else {
        let (sql, values) = Query::select()
            .expr(Expr::col(Schedulers::Seq))
            .from(Schedulers::Table)
            .and_where(Expr::col(Schedulers::Name).eq(sid))
            .build_sqlx(SqliteQueryBuilder);

        if let Some(row) = sqlx::query_with(&sql, values).fetch_optional(&mut *conn).await? {
            row.try_get::<i64, _>("seq")?
        } else {
            next_seq(conn, queue).await?
        }
    };

    let (sql, values) = Query::insert()
        .into_table(Schedulers::Table)
        .columns([
            Schedulers::Name,
            Schedulers::Queue,
            Schedulers::Seq,
            Schedulers::List,
            Schedulers::Folder,
            Schedulers::UpdatedAt
        ])
        .values_panic([
            sid.into(),
            queue.into(),
            seq.into(),
            list.into(),
            folder.to_string_lossy().as_ref().into(),
            now.into()
        ])
        .on_conflict(
            OnConflict::column(Schedulers::Name)
                .update_columns([
                    Schedulers::Queue,
                    Schedulers::Seq,
                    Schedulers::List,
                    Schedulers::Folder,
                    Schedulers::UpdatedAt
                ])
                .to_owned()
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&mut *conn).await?;
    tx.commit().await?;
    Ok(seq)
}

pub async fn move_queue(
    sid: &str,
    to: QueueType
) -> Result<i64> {
    let pool = get_db().await?;
    let mut tx = pool.begin().await?;
    let conn = tx.acquire().await?;

    let queue = to.as_str();
    let now = get_ts(true);
    let next = next_seq(conn, queue).await?;

    let (sql, values) = Query::update()
        .table(Schedulers::Table)
        .values([
            (Schedulers::Queue, queue.into()),
            (Schedulers::Seq, next.into()),
            (Schedulers::UpdatedAt, now.into())
        ])
        .and_where(Expr::col(Schedulers::Name).eq(sid))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&mut *conn).await?;
    tx.commit().await?;
    Ok(next)
}

pub async fn update_list(
    sid: &str,
    list: &[Arc<String>],
) -> Result<()> {
    let pool = get_db().await?;
    let now = get_ts(true);
    let list = serde_json::to_string(list)?;

    let (sql, values) = Query::update()
        .table(Schedulers::Table)
        .values([
            (Schedulers::List, list.into()),
            (Schedulers::UpdatedAt, now.into())
        ])
        .and_where(Expr::col(Schedulers::Name).eq(sid))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

pub async fn delete(name: &str) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(Schedulers::Table)
        .cond_where(Expr::col(Schedulers::Name).eq(name))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

async fn check_waiting() -> Result<()> {
    let pool = get_db().await?;
    let (sql, values) = Query::select()
        .expr(Expr::col(Schedulers::Name))
        .from(Schedulers::Table)
        .and_where(Expr::col(Schedulers::Name).eq(WAITING_SID))
        .build_sqlx(SqliteQueryBuilder);

    let row = sqlx::query_with(&sql, values).fetch_optional(&pool).await?;
    if row.is_some() {
        return Ok(());
    }

    upsert(WAITING_SID, QueueType::Waiting, &[], &PathBuf::new(), Some(0)).await?;
    Ok(())
}

pub async fn load() -> Result<()> {
    check_waiting().await?;
    let pool = get_db().await?;
    let (sql, values) = Query::select()
        .columns([
            Schedulers::Name,
            Schedulers::Queue,
            Schedulers::Seq,
            Schedulers::List,
            Schedulers::Folder,
            Schedulers::UpdatedAt
        ])
        .from(Schedulers::Table)
        .order_by(Schedulers::Seq, Order::Asc)
        .build_sqlx(SqliteQueryBuilder);
    
    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;
    for r in rows {
        let sid = Arc::new(r.try_get::<String, _>("name")?);
        let queue = QueueType::from_str_lossy(
            &r.try_get::<String, _>("queue")?
        );
        let list: Vec<Arc<String>> = serde_json::from_str(
            &r.try_get::<String, _>("list")?
        )?;
        let folder = PathBuf::from_str(
            &r.try_get::<String, _>("folder")?
        )?;
        let scheduler = Scheduler::new(
            sid.clone(), list.clone(), folder
        );
        let mut queue = TASK_MANAGER.get_queue(&queue).write().await;
        queue.push_back(sid.clone());
        drop(queue);
        let mut guard = TASK_MANAGER.schedulers.write().await;
        guard.insert(sid, scheduler);
        drop(guard);
    }
    Ok(())
}