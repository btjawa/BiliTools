//! 转换任务存储模块
//!
//! 提供转换任务的数据库持久化功能，支持任务恢复。

use anyhow::Result;
use sea_query::{
    ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_query_binder::SqlxBinder;
use sqlx::Row;
use std::path::PathBuf;

use crate::{
    services::converter::{
        ConvertConfig, ConvertProgress, ConvertTaskView,
    },
    shared::get_millis,
};

use super::db::{get_db, TableSpec};

/// 转换任务表字段定义
#[derive(Iden, Clone, Copy)]
pub enum ConvertTasks {
    Table,
    Id,
    CacheId,
    CachePath,
    OutputDir,
    OutputPath,
    Config,
    Progress,
    ErrorMessage,
    Title,
    CreatedAt,
    UpdatedAt,
    CompletedAt,
}

/// 转换任务表规范
pub struct ConvertTasksTable;

impl TableSpec for ConvertTasksTable {
    const NAME: &'static str = "convert_tasks";
    const LATEST: i32 = 1;

    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(ConvertTasks::Table)
            .col(
                ColumnDef::new(ConvertTasks::Id)
                    .text()
                    .not_null()
                    .primary_key(),
            )
            .col(ColumnDef::new(ConvertTasks::CacheId).text().not_null())
            .col(ColumnDef::new(ConvertTasks::CachePath).text().not_null())
            .col(ColumnDef::new(ConvertTasks::OutputDir).text().not_null())
            .col(ColumnDef::new(ConvertTasks::OutputPath).text())
            .col(ColumnDef::new(ConvertTasks::Config).text().not_null())
            .col(ColumnDef::new(ConvertTasks::Progress).text().not_null())
            .col(ColumnDef::new(ConvertTasks::ErrorMessage).text())
            .col(ColumnDef::new(ConvertTasks::Title).text().not_null())
            .col(ColumnDef::new(ConvertTasks::CreatedAt).integer().not_null())
            .col(ColumnDef::new(ConvertTasks::UpdatedAt).integer().not_null())
            .col(ColumnDef::new(ConvertTasks::CompletedAt).integer())
            .to_owned()
    }
}

/// 插入或更新转换任务
pub async fn upsert(task: &ConvertTaskView) -> Result<()> {
    let pool = get_db().await?;
    let now = get_millis();

    let (sql, values) = Query::insert()
        .into_table(ConvertTasks::Table)
        .columns([
            ConvertTasks::Id,
            ConvertTasks::CacheId,
            ConvertTasks::CachePath,
            ConvertTasks::OutputDir,
            ConvertTasks::OutputPath,
            ConvertTasks::Config,
            ConvertTasks::Progress,
            ConvertTasks::ErrorMessage,
            ConvertTasks::Title,
            ConvertTasks::CreatedAt,
            ConvertTasks::UpdatedAt,
            ConvertTasks::CompletedAt,
        ])
        .values([
            task.id.clone().into(),
            task.cache_id.clone().into(),
            task.cache_path.to_string_lossy().to_string().into(),
            task.output_dir.to_string_lossy().to_string().into(),
            task.output_path
                .as_ref()
                .map(|p| p.to_string_lossy().to_string())
                .into(),
            serde_json::to_string(&task.config)?.into(),
            serde_json::to_string(&task.progress)?.into(),
            task.error_message.clone().into(),
            task.title.clone().into(),
            (task.created_at as i64).into(),
            (now as i64).into(),
            task.completed_at.map(|t| t as i64).into(),
        ])?
        .on_conflict(
            OnConflict::column(ConvertTasks::Id)
                .update_columns([
                    ConvertTasks::OutputPath,
                    ConvertTasks::Progress,
                    ConvertTasks::ErrorMessage,
                    ConvertTasks::UpdatedAt,
                    ConvertTasks::CompletedAt,
                ])
                .to_owned(),
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 更新任务进度
pub async fn update_progress(task_id: &str, progress: &ConvertProgress) -> Result<()> {
    let pool = get_db().await?;
    let now = get_millis();

    let (sql, values) = Query::update()
        .table(ConvertTasks::Table)
        .values([
            (ConvertTasks::Progress, serde_json::to_string(progress)?.into()),
            (ConvertTasks::UpdatedAt, (now as i64).into()),
        ])
        .and_where(Expr::col(ConvertTasks::Id).eq(task_id))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 更新任务输出路径
pub async fn update_output_path(task_id: &str, output_path: &PathBuf) -> Result<()> {
    let pool = get_db().await?;
    let now = get_millis();

    let (sql, values) = Query::update()
        .table(ConvertTasks::Table)
        .values([
            (
                ConvertTasks::OutputPath,
                output_path.to_string_lossy().to_string().into(),
            ),
            (ConvertTasks::UpdatedAt, (now as i64).into()),
        ])
        .and_where(Expr::col(ConvertTasks::Id).eq(task_id))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 标记任务完成
pub async fn mark_completed(task_id: &str, progress: &ConvertProgress) -> Result<()> {
    let pool = get_db().await?;
    let now = get_millis();

    let (sql, values) = Query::update()
        .table(ConvertTasks::Table)
        .values([
            (ConvertTasks::Progress, serde_json::to_string(progress)?.into()),
            (ConvertTasks::UpdatedAt, (now as i64).into()),
            (ConvertTasks::CompletedAt, (now as i64).into()),
        ])
        .and_where(Expr::col(ConvertTasks::Id).eq(task_id))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 设置任务错误
pub async fn set_error(task_id: &str, error_message: &str, progress: &ConvertProgress) -> Result<()> {
    let pool = get_db().await?;
    let now = get_millis();

    let (sql, values) = Query::update()
        .table(ConvertTasks::Table)
        .values([
            (ConvertTasks::ErrorMessage, error_message.into()),
            (ConvertTasks::Progress, serde_json::to_string(progress)?.into()),
            (ConvertTasks::UpdatedAt, (now as i64).into()),
        ])
        .and_where(Expr::col(ConvertTasks::Id).eq(task_id))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 删除任务
pub async fn delete(task_id: &str) -> Result<()> {
    let pool = get_db().await?;

    let (sql, values) = Query::delete()
        .from_table(ConvertTasks::Table)
        .cond_where(Expr::col(ConvertTasks::Id).eq(task_id))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 获取单个任务
pub async fn get_by_id(task_id: &str) -> Result<Option<ConvertTaskView>> {
    let pool = get_db().await?;

    let (sql, values) = Query::select()
        .columns([
            ConvertTasks::Id,
            ConvertTasks::CacheId,
            ConvertTasks::CachePath,
            ConvertTasks::OutputDir,
            ConvertTasks::OutputPath,
            ConvertTasks::Config,
            ConvertTasks::Progress,
            ConvertTasks::ErrorMessage,
            ConvertTasks::Title,
            ConvertTasks::CreatedAt,
            ConvertTasks::UpdatedAt,
            ConvertTasks::CompletedAt,
        ])
        .from(ConvertTasks::Table)
        .cond_where(Expr::col(ConvertTasks::Id).eq(task_id))
        .build_sqlx(SqliteQueryBuilder);

    let row = sqlx::query_with(&sql, values)
        .fetch_optional(&pool)
        .await?;

    match row {
        Some(r) => Ok(Some(row_to_task_view(&r)?)),
        None => Ok(None),
    }
}

/// 获取所有任务
pub async fn get_all() -> Result<Vec<ConvertTaskView>> {
    let pool = get_db().await?;

    let (sql, values) = Query::select()
        .columns([
            ConvertTasks::Id,
            ConvertTasks::CacheId,
            ConvertTasks::CachePath,
            ConvertTasks::OutputDir,
            ConvertTasks::OutputPath,
            ConvertTasks::Config,
            ConvertTasks::Progress,
            ConvertTasks::ErrorMessage,
            ConvertTasks::Title,
            ConvertTasks::CreatedAt,
            ConvertTasks::UpdatedAt,
            ConvertTasks::CompletedAt,
        ])
        .from(ConvertTasks::Table)
        .build_sqlx(SqliteQueryBuilder);

    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;

    let mut tasks = Vec::new();
    for r in rows {
        tasks.push(row_to_task_view(&r)?);
    }
    Ok(tasks)
}

/// 获取未完成的任务（用于恢复）
///
/// 返回所有非终态的任务（不是 Completed、Failed、Cancelled 状态）
pub async fn get_incomplete() -> Result<Vec<ConvertTaskView>> {
    let all_tasks = get_all().await?;

    // 过滤出未完成的任务
    let incomplete: Vec<ConvertTaskView> = all_tasks
        .into_iter()
        .filter(|task| !task.progress.stage.is_terminal())
        .collect();

    Ok(incomplete)
}

/// 清理已完成的任务（可选：保留最近 N 天的记录）
pub async fn cleanup_completed(days_to_keep: Option<i64>) -> Result<i32> {
    let pool = get_db().await?;

    // 由于 Progress 是 JSON 字符串，我们需要使用 LIKE 来匹配
    // 这里简化处理：获取所有任务，在内存中过滤
    let all_tasks = get_all().await?;
    let mut deleted_count = 0;

    let cutoff_time = days_to_keep.map(|days| {
        let now = get_millis() as i64;
        now - (days * 24 * 60 * 60 * 1000)
    });

    for task in all_tasks {
        let should_delete = task.progress.stage.is_terminal()
            && cutoff_time
                .map(|cutoff| (task.updated_at as i64) < cutoff)
                .unwrap_or(true);

        if should_delete {
            let (sql, values) = Query::delete()
                .from_table(ConvertTasks::Table)
                .cond_where(Expr::col(ConvertTasks::Id).eq(&task.id))
                .build_sqlx(SqliteQueryBuilder);

            sqlx::query_with(&sql, values).execute(&pool).await?;
            deleted_count += 1;
        }
    }

    Ok(deleted_count)
}

/// 将数据库行转换为 ConvertTaskView
fn row_to_task_view(row: &sqlx::sqlite::SqliteRow) -> Result<ConvertTaskView> {
    let id: String = row.try_get("id")?;
    let cache_id: String = row.try_get("cache_id")?;
    let cache_path: String = row.try_get("cache_path")?;
    let output_dir: String = row.try_get("output_dir")?;
    let output_path: Option<String> = row.try_get("output_path")?;
    let config_json: String = row.try_get("config")?;
    let progress_json: String = row.try_get("progress")?;
    let error_message: Option<String> = row.try_get("error_message")?;
    let title: String = row.try_get("title")?;
    let created_at: i64 = row.try_get("created_at")?;
    let updated_at: i64 = row.try_get("updated_at")?;
    let completed_at: Option<i64> = row.try_get("completed_at")?;

    let config: ConvertConfig = serde_json::from_str(&config_json)?;
    let progress: ConvertProgress = serde_json::from_str(&progress_json)?;

    Ok(ConvertTaskView {
        id,
        cache_id,
        cache_path: PathBuf::from(cache_path),
        output_dir: PathBuf::from(output_dir),
        output_path: output_path.map(PathBuf::from),
        config,
        progress,
        error_message,
        title,
        created_at: created_at as u64,
        updated_at: updated_at as u64,
        completed_at: completed_at.map(|t| t as u64),
    })
}
