use anyhow::Result;
use sea_query::{
    ColumnDef, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_query_binder::SqlxBinder;
use sqlx::Row;
use std::collections::{HashMap, VecDeque};

use crate::queue::{atomics::QueueType, manager::MANAGER};

use super::db::{get_db, TableSpec};

#[derive(Iden, Clone, Copy)]
pub enum Queue {
    Table,
    Name,
    Value,
}

pub struct QueueTable;

impl TableSpec for QueueTable {
    const NAME: &'static str = "queue";
    const LATEST: i32 = 1;
    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(Queue::Table)
            .col(
                ColumnDef::new(Queue::Name)
                    .integer()
                    .not_null()
                    .primary_key(),
            )
            .col(ColumnDef::new(Queue::Value).text().not_null())
            .to_owned()
    }
}

pub async fn load() -> Result<HashMap<QueueType, Vec<String>>> {
    let (sql, values) = Query::select()
        .columns([Queue::Table, Queue::Name, Queue::Value])
        .from(Queue::Table)
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;

    let mut map = HashMap::new();

    for r in rows {
        let q = r.try_get::<u8, _>("name")?;
        let v: Vec<String> = serde_json::from_str(&r.try_get::<String, _>("value")?)?;
        let key: QueueType = q.into();
        let mut queue = MANAGER.get_queue(&key).write().await;

        queue.clear();
        queue.extend(v.clone());

        drop(queue);

        map.insert(key, v);
    }
    Ok(map)
}

pub async fn upsert(name: QueueType, value: &VecDeque<String>) -> Result<()> {
    let pool = get_db().await?;
    let val = serde_json::to_string(value)?;
    let (sql, values) = Query::insert()
        .into_table(Queue::Table)
        .columns([Queue::Name, Queue::Value])
        .values([(name as u8).into(), val.into()])?
        .on_conflict(
            OnConflict::column(Queue::Name)
                .update_columns([Queue::Value])
                .to_owned(),
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}
