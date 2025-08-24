use sea_query::{Alias, ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement};
use sqlx::{sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions}, SqlitePool, Row};
use std::{str::FromStr, time::Duration};
use anyhow::{anyhow, Context, Result};
use sea_query_binder::SqlxBinder;
use crate::shared::DATABASE_URL;
use tokio::sync::OnceCell;

static DB: OnceCell<SqlitePool> = OnceCell::const_new();

#[derive(Iden)] enum Meta {
    Table, Name, Version
}

pub trait TableSpec: Send + Sync + 'static {
    const NAME: &'static str;
    const LATEST: i32;
    fn create_stmt() -> TableCreateStatement;
    async fn check_latest() -> Result<()> {
        init_meta().await?;
        let db = get_db()?;
        let cur = get_version(Self::NAME).await?;
        if cur != Self::LATEST {
            let mut tx = db.begin().await?;

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
    }
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

    DB.set(pool).context("DB already initialized")?;
    Ok(())
}

pub fn get_db() -> Result<SqlitePool> {
    DB.get().cloned().ok_or(anyhow!("DB not initialized"))
}

pub async fn init_meta() -> Result<()> {
    let sql = Table::create()
        .table(Meta::Table)
        .if_not_exists()
        .col(ColumnDef::new(Meta::Name).text().not_null().primary_key())
        .col(ColumnDef::new(Meta::Version).integer().not_null().default(0))
        .to_string(SqliteQueryBuilder);

    sqlx::query(&sql).execute(&get_db()?).await?;
    Ok(())
}

pub async fn get_version(name: &str) -> Result<i32> {
    let (sql, values) = Query::select()
        .column(Meta::Version)
        .from(Meta::Table)
        .cond_where(Expr::col(Meta::Name).eq(name))
        .build_sqlx(SqliteQueryBuilder);

    if let Some(row) = sqlx::query_with(&sql, values).fetch_optional(&get_db()?).await? {
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

    sqlx::query_with(&sql, values).execute(&get_db()?).await?;
    Ok(())
}