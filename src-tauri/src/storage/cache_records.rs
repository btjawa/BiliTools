use anyhow::Result;
use sea_query::{
    ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_query_binder::SqlxBinder;
use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::Row;

use super::db::{get_db, TableSpec};

#[derive(Iden, Clone, Copy)]
pub enum CacheRecords {
    Table,
    Id,
    Bvid,
    Aid,
    Cid,
    Title,
    Uname,
    CoverUrl,
    Duration,
    FileSize,
    CachePath,
    DownloadTime,
    ImportTime,
    Status,
    Source,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, Type)]
pub struct CacheRecord {
    pub id: String,
    pub bvid: String,
    pub aid: i64,
    pub cid: i64,
    pub title: String,
    pub uname: String,
    pub cover_url: String,
    pub duration: i64,
    pub file_size: i64,
    pub cache_path: String,
    pub download_time: i64, // 视频原始下载时间（从videoInfo.json获取）
    pub import_time: i64,   // 导入到BiliTools的时间，使用get_millis()统一时间戳格式
    pub status: String,
    pub source: String, // "local_cache_import"
}

pub struct CacheRecordsTable;

impl TableSpec for CacheRecordsTable {
    const NAME: &'static str = "cache_records";
    const LATEST: i32 = 1;

    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(CacheRecords::Table)
            .col(
                ColumnDef::new(CacheRecords::Id)
                    .text()
                    .not_null()
                    .primary_key(),
            )
            .col(ColumnDef::new(CacheRecords::Bvid).text().not_null())
            .col(ColumnDef::new(CacheRecords::Aid).integer().not_null())
            .col(ColumnDef::new(CacheRecords::Cid).integer().not_null())
            .col(ColumnDef::new(CacheRecords::Title).text().not_null())
            .col(ColumnDef::new(CacheRecords::Uname).text().not_null())
            .col(ColumnDef::new(CacheRecords::CoverUrl).text().not_null())
            .col(ColumnDef::new(CacheRecords::Duration).integer().not_null())
            .col(ColumnDef::new(CacheRecords::FileSize).integer().not_null())
            .col(ColumnDef::new(CacheRecords::CachePath).text().not_null())
            .col(
                ColumnDef::new(CacheRecords::DownloadTime)
                    .integer()
                    .not_null(),
            )
            .col(
                ColumnDef::new(CacheRecords::ImportTime)
                    .integer()
                    .not_null(),
            )
            .col(ColumnDef::new(CacheRecords::Status).text().not_null())
            .col(ColumnDef::new(CacheRecords::Source).text().not_null())
            .to_owned()
    }
}

// CRUD 操作方法

/// 插入新的缓存记录
pub async fn insert(record: &CacheRecord) -> Result<()> {
    let pool = get_db().await?;
    let (sql, values) = Query::insert()
        .into_table(CacheRecords::Table)
        .columns([
            CacheRecords::Id,
            CacheRecords::Bvid,
            CacheRecords::Aid,
            CacheRecords::Cid,
            CacheRecords::Title,
            CacheRecords::Uname,
            CacheRecords::CoverUrl,
            CacheRecords::Duration,
            CacheRecords::FileSize,
            CacheRecords::CachePath,
            CacheRecords::DownloadTime,
            CacheRecords::ImportTime,
            CacheRecords::Status,
            CacheRecords::Source,
        ])
        .values([
            record.id.clone().into(),
            record.bvid.clone().into(),
            record.aid.into(),
            record.cid.into(),
            record.title.clone().into(),
            record.uname.clone().into(),
            record.cover_url.clone().into(),
            record.duration.into(),
            record.file_size.into(),
            record.cache_path.clone().into(),
            record.download_time.into(),
            record.import_time.into(),
            record.status.clone().into(),
            record.source.clone().into(),
        ])?
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 更新或插入缓存记录（处理重复）
pub async fn upsert(record: &CacheRecord) -> Result<()> {
    let pool = get_db().await?;
    let (sql, values) = Query::insert()
        .into_table(CacheRecords::Table)
        .columns([
            CacheRecords::Id,
            CacheRecords::Bvid,
            CacheRecords::Aid,
            CacheRecords::Cid,
            CacheRecords::Title,
            CacheRecords::Uname,
            CacheRecords::CoverUrl,
            CacheRecords::Duration,
            CacheRecords::FileSize,
            CacheRecords::CachePath,
            CacheRecords::DownloadTime,
            CacheRecords::ImportTime,
            CacheRecords::Status,
            CacheRecords::Source,
        ])
        .values([
            record.id.clone().into(),
            record.bvid.clone().into(),
            record.aid.into(),
            record.cid.into(),
            record.title.clone().into(),
            record.uname.clone().into(),
            record.cover_url.clone().into(),
            record.duration.into(),
            record.file_size.into(),
            record.cache_path.clone().into(),
            record.download_time.into(),
            record.import_time.into(),
            record.status.clone().into(),
            record.source.clone().into(),
        ])?
        .on_conflict(
            OnConflict::column(CacheRecords::Id)
                .update_columns([
                    CacheRecords::Title,
                    CacheRecords::Uname,
                    CacheRecords::CoverUrl,
                    CacheRecords::Duration,
                    CacheRecords::FileSize,
                    CacheRecords::CachePath,
                    CacheRecords::DownloadTime,
                    CacheRecords::ImportTime,
                    CacheRecords::Status,
                    CacheRecords::Source,
                ])
                .to_owned(),
        )
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 根据ID查询缓存记录
pub async fn get_by_id(id: &str) -> Result<Option<CacheRecord>> {
    let (sql, values) = Query::select()
        .columns([
            CacheRecords::Id,
            CacheRecords::Bvid,
            CacheRecords::Aid,
            CacheRecords::Cid,
            CacheRecords::Title,
            CacheRecords::Uname,
            CacheRecords::CoverUrl,
            CacheRecords::Duration,
            CacheRecords::FileSize,
            CacheRecords::CachePath,
            CacheRecords::DownloadTime,
            CacheRecords::ImportTime,
            CacheRecords::Status,
            CacheRecords::Source,
        ])
        .from(CacheRecords::Table)
        .and_where(Expr::col(CacheRecords::Id).eq(id))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let row = sqlx::query_with(&sql, values).fetch_optional(&pool).await?;

    if let Some(r) = row {
        Ok(Some(CacheRecord {
            id: r.try_get("id")?,
            bvid: r.try_get("bvid")?,
            aid: r.try_get("aid")?,
            cid: r.try_get("cid")?,
            title: r.try_get("title")?,
            uname: r.try_get("uname")?,
            cover_url: r.try_get("cover_url")?,
            duration: r.try_get("duration")?,
            file_size: r.try_get("file_size")?,
            cache_path: r.try_get("cache_path")?,
            download_time: r.try_get("download_time")?,
            import_time: r.try_get("import_time")?,
            status: r.try_get("status")?,
            source: r.try_get("source")?,
        }))
    } else {
        Ok(None)
    }
}

/// 根据bvid和cid查询缓存记录（检测重复）
pub async fn get_by_bvid_cid(bvid: &str, cid: i64) -> Result<Option<CacheRecord>> {
    let (sql, values) = Query::select()
        .columns([
            CacheRecords::Id,
            CacheRecords::Bvid,
            CacheRecords::Aid,
            CacheRecords::Cid,
            CacheRecords::Title,
            CacheRecords::Uname,
            CacheRecords::CoverUrl,
            CacheRecords::Duration,
            CacheRecords::FileSize,
            CacheRecords::CachePath,
            CacheRecords::DownloadTime,
            CacheRecords::ImportTime,
            CacheRecords::Status,
            CacheRecords::Source,
        ])
        .from(CacheRecords::Table)
        .and_where(Expr::col(CacheRecords::Bvid).eq(bvid))
        .and_where(Expr::col(CacheRecords::Cid).eq(cid))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let row = sqlx::query_with(&sql, values).fetch_optional(&pool).await?;

    if let Some(r) = row {
        Ok(Some(CacheRecord {
            id: r.try_get("id")?,
            bvid: r.try_get("bvid")?,
            aid: r.try_get("aid")?,
            cid: r.try_get("cid")?,
            title: r.try_get("title")?,
            uname: r.try_get("uname")?,
            cover_url: r.try_get("cover_url")?,
            duration: r.try_get("duration")?,
            file_size: r.try_get("file_size")?,
            cache_path: r.try_get("cache_path")?,
            download_time: r.try_get("download_time")?,
            import_time: r.try_get("import_time")?,
            status: r.try_get("status")?,
            source: r.try_get("source")?,
        }))
    } else {
        Ok(None)
    }
}

/// 获取所有缓存记录
pub async fn get_all() -> Result<Vec<CacheRecord>> {
    let (sql, values) = Query::select()
        .columns([
            CacheRecords::Id,
            CacheRecords::Bvid,
            CacheRecords::Aid,
            CacheRecords::Cid,
            CacheRecords::Title,
            CacheRecords::Uname,
            CacheRecords::CoverUrl,
            CacheRecords::Duration,
            CacheRecords::FileSize,
            CacheRecords::CachePath,
            CacheRecords::DownloadTime,
            CacheRecords::ImportTime,
            CacheRecords::Status,
            CacheRecords::Source,
        ])
        .from(CacheRecords::Table)
        .order_by(CacheRecords::ImportTime, sea_query::Order::Desc)
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;

    let mut records = Vec::new();
    for r in rows {
        records.push(CacheRecord {
            id: r.try_get("id")?,
            bvid: r.try_get("bvid")?,
            aid: r.try_get("aid")?,
            cid: r.try_get("cid")?,
            title: r.try_get("title")?,
            uname: r.try_get("uname")?,
            cover_url: r.try_get("cover_url")?,
            duration: r.try_get("duration")?,
            file_size: r.try_get("file_size")?,
            cache_path: r.try_get("cache_path")?,
            download_time: r.try_get("download_time")?,
            import_time: r.try_get("import_time")?,
            status: r.try_get("status")?,
            source: r.try_get("source")?,
        });
    }
    Ok(records)
}

/// 根据状态筛选缓存记录
pub async fn get_by_status(status: &str) -> Result<Vec<CacheRecord>> {
    let (sql, values) = Query::select()
        .columns([
            CacheRecords::Id,
            CacheRecords::Bvid,
            CacheRecords::Aid,
            CacheRecords::Cid,
            CacheRecords::Title,
            CacheRecords::Uname,
            CacheRecords::CoverUrl,
            CacheRecords::Duration,
            CacheRecords::FileSize,
            CacheRecords::CachePath,
            CacheRecords::DownloadTime,
            CacheRecords::ImportTime,
            CacheRecords::Status,
            CacheRecords::Source,
        ])
        .from(CacheRecords::Table)
        .and_where(Expr::col(CacheRecords::Status).eq(status))
        .order_by(CacheRecords::ImportTime, sea_query::Order::Desc)
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;

    let mut records = Vec::new();
    for r in rows {
        records.push(CacheRecord {
            id: r.try_get("id")?,
            bvid: r.try_get("bvid")?,
            aid: r.try_get("aid")?,
            cid: r.try_get("cid")?,
            title: r.try_get("title")?,
            uname: r.try_get("uname")?,
            cover_url: r.try_get("cover_url")?,
            duration: r.try_get("duration")?,
            file_size: r.try_get("file_size")?,
            cache_path: r.try_get("cache_path")?,
            download_time: r.try_get("download_time")?,
            import_time: r.try_get("import_time")?,
            status: r.try_get("status")?,
            source: r.try_get("source")?,
        });
    }
    Ok(records)
}

/// 更新缓存记录状态
pub async fn update_status(id: &str, status: &str) -> Result<()> {
    let pool = get_db().await?;
    let (sql, values) = Query::update()
        .table(CacheRecords::Table)
        .values([(CacheRecords::Status, status.into())])
        .and_where(Expr::col(CacheRecords::Id).eq(id))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 删除缓存记录
pub async fn delete(id: &str) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(CacheRecords::Table)
        .cond_where(Expr::col(CacheRecords::Id).eq(id))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 根据bvid和cid删除缓存记录
pub async fn delete_by_bvid_cid(bvid: &str, cid: i64) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(CacheRecords::Table)
        .cond_where(Expr::col(CacheRecords::Bvid).eq(bvid))
        .cond_where(Expr::col(CacheRecords::Cid).eq(cid))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

/// 获取缓存记录总数
pub async fn count() -> Result<i64> {
    let (sql, values) = Query::select()
        .expr(Expr::col(CacheRecords::Id).count())
        .from(CacheRecords::Table)
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let row = sqlx::query_with(&sql, values).fetch_one(&pool).await?;
    Ok(row.try_get::<i64, _>(0)?)
}

/// 获取缓存文件总大小
pub async fn total_size() -> Result<i64> {
    let (sql, values) = Query::select()
        .expr(Expr::col(CacheRecords::FileSize).sum())
        .from(CacheRecords::Table)
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let row = sqlx::query_with(&sql, values).fetch_one(&pool).await?;
    Ok(row.try_get::<Option<i64>, _>(0)?.unwrap_or(0))
}
