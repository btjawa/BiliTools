use sea_query::{Alias, ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement};
use sqlx::{sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions}, SqlitePool, Row};
use std::{future::Future, path::PathBuf, str::FromStr, time::Duration};
use tokio::{fs, sync::{Notify, RwLock}};
use sea_query_binder::SqlxBinder;
use anyhow::Result;

use crate::shared::{DATABASE_URL, STORAGE_PATH};

static DB: RwLock<Option<SqlitePool>> = RwLock::const_new(None);
static DB_READY: Notify = Notify::const_new();

#[derive(Iden)] enum Meta {
    Table, Name, Version
}

pub trait TableSpec: Send + Sync + 'static {
    const NAME: &'static str;
    const LATEST: i32;
    fn create_stmt() -> TableCreateStatement;
    // actually async
    fn check_latest() -> impl Future<Output = Result<()>> { async {
        init_meta().await?;
        let pool = get_db().await?;
        let cur = get_version(Self::NAME).await?;
        if cur != Self::LATEST {
            let mut tx = pool.begin().await?;

            let drop_sql = Table::drop()
                .table(Alias::new(Self::NAME))
                .if_exists()
                .to_string(SqliteQueryBuilder);

            sqlx::query(&drop_sql).execute(&mut *tx).await.ok();

            let create_sql = Self::create_stmt().to_string(SqliteQueryBuilder);
            sqlx::query(&create_sql).execute(&mut *tx).await?;

            tx.commit().await?;

            set_version(Self::NAME, Self::LATEST).await?;
        }
        Ok(())
    } }
}

pub async fn init_db() -> Result<()> {
    let opts = SqliteConnectOptions::from_str(&DATABASE_URL)?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .foreign_keys(true)
        .busy_timeout(Duration::from_secs(3));

    let pool = SqlitePoolOptions::new()
        .max_connections(6)
        .min_connections(1)
        .connect_with(opts)
        .await?;

    let mut guard = DB.write().await;
    *guard = Some(pool);
    drop(guard);
    DB_READY.notify_waiters();
    Ok(())
}

pub async fn get_db() -> Result<SqlitePool> {
    loop {
        if let Some(pool) = DB.read().await.clone() {
            return Ok(pool);
        }
        DB_READY.notified().await;
    }
}

pub async fn init_meta() -> Result<()> {
    let sql = Table::create()
        .table(Meta::Table)
        .if_not_exists()
        .col(ColumnDef::new(Meta::Name).text().not_null().primary_key())
        .col(ColumnDef::new(Meta::Version).integer().not_null().default(0))
        .to_string(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query(&sql).execute(&pool).await?;
    Ok(())
}

pub async fn get_version(name: &str) -> Result<i32> {
    let (sql, values) = Query::select()
        .column(Meta::Version)
        .from(Meta::Table)
        .cond_where(Expr::col(Meta::Name).eq(name))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    if let Some(row) = sqlx::query_with(&sql, values).fetch_optional(&pool).await? {
        Ok(row.try_get::<i32, _>("version")?)
    } else {
        Ok(0)
    }
}

pub async fn set_version(name: &str, value: i32) -> Result<()> {
    let (sql, values) = Query::insert()
        .into_table(Meta::Table)
        .columns([Meta::Name, Meta::Version])
        .values_panic([name.into(), value.into()])
        .on_conflict(
            OnConflict::column(Meta::Name)
                .update_columns([Meta::Version])
                .to_owned()
        )
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

pub async fn import(input: PathBuf) -> Result<()> {
    let mut guard = DB.write().await;
    if let Some(old) = guard.take() {
        old.close().await;
    }
    drop(guard);
    let target = STORAGE_PATH.to_string_lossy();
    let _ = fs::remove_file(&*target).await;
    let _ = fs::remove_file(&format!("{target}-wal")).await;
    let _ = fs::remove_file(&format!("{target}-shm")).await;
    fs::copy(&input, &*target).await?;
    init_db().await?;
    Ok(())
}

pub async fn export(output: PathBuf) -> Result<()> {
    let pool = get_db().await?;
    let mut conn = pool.acquire().await?;
    let output = output.to_string_lossy().replace('\'', "''");
    sqlx::query("PRAGMA wal_checkpoint(FULL);").execute(&mut *conn).await?;
    sqlx::query(&format!("VACUUM INTO '{output}';")).execute(&mut *conn).await?;
    Ok(())
}