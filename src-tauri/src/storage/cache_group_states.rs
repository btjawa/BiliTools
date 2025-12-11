use anyhow::Result;
use sea_query::{
    ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_query_binder::SqlxBinder;
use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::Row;

use super::db::{get_db, TableSpec};
use crate::shared::get_millis;

#[derive(Iden, Clone, Copy)]
pub enum CacheGroupStates {
    Table,
    GroupId,
    IsExpanded,
    CreatedAt,
    UpdatedAt,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, Type)]
pub struct CacheGroupState {
    pub group_id: String,
    pub is_expanded: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct CacheGroupStatesTable;

impl TableSpec for CacheGroupStatesTable {
    const NAME: &'static str = "cache_group_states";
    const LATEST: i32 = 1;

    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(CacheGroupStates::Table)
            .col(
                ColumnDef::new(CacheGroupStates::GroupId)
                    .text()
                    .not_null()
                    .primary_key(),
            )
            .col(
                ColumnDef::new(CacheGroupStates::IsExpanded)
                    .boolean()
                    .not_null()
                    .default(false),
            )
            .col(
                ColumnDef::new(CacheGroupStates::CreatedAt)
                    .integer()
                    .not_null(),
            )
            .col(
                ColumnDef::new(CacheGroupStates::UpdatedAt)
                    .integer()
                    .not_null(),
            )
            .to_owned()
    }
}

// CRUD 操作方法

/// 获取组的展开状态
pub async fn get_expansion_state(group_id: &str) -> Result<bool> {
    let (sql, values) = Query::select()
        .column(CacheGroupStates::IsExpanded)
        .from(CacheGroupStates::Table)
        .and_where(Expr::col(CacheGroupStates::GroupId).eq(group_id))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    if let Some(row) = sqlx::query_with(&sql, values).fetch_optional(&pool).await? {
        Ok(row.try_get("is_expanded")?)
    } else {
        // 默认为折叠状态
        Ok(false)
    }
}

/// 设置组的展开状态
pub async fn set_expansion_state(group_id: &str, is_expanded: bool) -> Result<()> {
    let now = get_millis();
    let pool = get_db().await?;
    
    let (sql, values) = Query::insert()
        .into_table(CacheGroupStates::Table)
        .columns([
            CacheGroupStates::GroupId,
            CacheGroupStates::IsExpanded,
            CacheGroupStates::CreatedAt,
            CacheGroupStates::UpdatedAt,
        ])
        .values([
            group_id.into(),
            is_expanded.into(),
            now.into(),
            now.into(),
        ])?
        .on_conflict(
            OnConflict::column(CacheGroupStates::GroupId)
                .update_columns([
                    CacheGroupStates::IsExpanded,
                    CacheGroupStates::UpdatedAt,
                ])
                .to_owned(),
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 获取所有组状态
pub async fn get_all_states() -> Result<Vec<CacheGroupState>> {
    let (sql, values) = Query::select()
        .columns([
            CacheGroupStates::GroupId,
            CacheGroupStates::IsExpanded,
            CacheGroupStates::CreatedAt,
            CacheGroupStates::UpdatedAt,
        ])
        .from(CacheGroupStates::Table)
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;

    let mut states = Vec::new();
    for r in rows {
        states.push(CacheGroupState {
            group_id: r.try_get("group_id")?,
            is_expanded: r.try_get("is_expanded")?,
            created_at: r.try_get("created_at")?,
            updated_at: r.try_get("updated_at")?,
        });
    }
    Ok(states)
}

/// 删除组状态
pub async fn delete_state(group_id: &str) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(CacheGroupStates::Table)
        .cond_where(Expr::col(CacheGroupStates::GroupId).eq(group_id))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 清理不存在的组状态（清理孤立记录）
pub async fn cleanup_orphaned_states() -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(CacheGroupStates::Table)
        .cond_where(
            Expr::col(CacheGroupStates::GroupId).not_in_subquery(
                Query::select()
                    .distinct()
                    .column((super::cache_records::CacheRecords::Table, super::cache_records::CacheRecords::GroupId))
                    .from(super::cache_records::CacheRecords::Table)
                    .and_where(Expr::col((super::cache_records::CacheRecords::Table, super::cache_records::CacheRecords::GroupId)).is_not_null())
                    .to_owned()
            )
        )
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}