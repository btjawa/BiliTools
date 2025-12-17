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
    GroupId,
    GroupTitle,
    P,
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
    pub download_time: i64,
    pub import_time: i64,
    pub status: String,
    pub source: String,
    pub group_id: Option<String>,
    pub group_title: Option<String>,
    pub p: i32, // 分P序号，默认为1
}

pub struct CacheRecordsTable;

impl TableSpec for CacheRecordsTable {
    const NAME: &'static str = "cache_records";
    const LATEST: i32 = 4; // 升级版本号：添加 group_title 字段

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
            .col(ColumnDef::new(CacheRecords::GroupId).text())
            .col(ColumnDef::new(CacheRecords::GroupTitle).text())
            .col(
                ColumnDef::new(CacheRecords::P)
                    .integer()
                    .not_null()
                    .default(1),
            )
            .to_owned()
    }

    // 自定义升级逻辑，保留现有数据
    async fn check_latest() -> Result<()> {
        use super::db::{get_db, get_version, init_meta, set_version};
        use sea_query::SqliteQueryBuilder;

        init_meta().await?;
        let pool = get_db().await?;
        let cur = get_version(Self::NAME).await?;

        if cur == 0 {
            // 首次创建表
            let create_sql = Self::create_stmt().to_string(SqliteQueryBuilder);
            sqlx::query(&create_sql).execute(&pool).await?;
            set_version(Self::NAME, Self::LATEST).await?;
        } else if cur < Self::LATEST {
            // 需要升级表结构
            let mut tx = pool.begin().await?;

            // 检查是否缺少 group_title 字段
            if cur < 4 {
                // 添加 group_title 字段
                let add_column_sql = format!(
                    "ALTER TABLE {} ADD COLUMN {} TEXT",
                    Self::NAME,
                    "group_title"
                );
                sqlx::query(&add_column_sql).execute(&mut *tx).await.ok();
            }

            tx.commit().await?;
            set_version(Self::NAME, Self::LATEST).await?;
        }

        Ok(())
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
            CacheRecords::GroupId,
            CacheRecords::GroupTitle,
            CacheRecords::P,
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
            record.group_id.clone().into(),
            record.group_title.clone().into(),
            record.p.into(),
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
            CacheRecords::GroupId,
            CacheRecords::GroupTitle,
            CacheRecords::P,
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
            record.group_id.clone().into(),
            record.group_title.clone().into(),
            record.p.into(),
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
                    CacheRecords::GroupId,
                    CacheRecords::GroupTitle,
                    CacheRecords::P,
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
            CacheRecords::GroupId,
            CacheRecords::GroupTitle,
            CacheRecords::P,
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
            group_id: r.try_get("group_id")?,
            group_title: r.try_get("group_title")?,
            p: r.try_get::<i32, _>("p").unwrap_or(1),
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
            CacheRecords::GroupId,
            CacheRecords::GroupTitle,
            CacheRecords::P,
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
            group_id: r.try_get("group_id")?,
            group_title: r.try_get("group_title")?,
            p: r.try_get::<i32, _>("p").unwrap_or(1),
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
            CacheRecords::GroupId,
            CacheRecords::GroupTitle,
            CacheRecords::P,
        ])
        .from(CacheRecords::Table)
        .order_by(CacheRecords::DownloadTime, sea_query::Order::Desc)
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
            group_id: r.try_get("group_id")?,
            group_title: r.try_get("group_title")?,
            p: r.try_get::<i32, _>("p").unwrap_or(1),
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
            CacheRecords::GroupId,
            CacheRecords::GroupTitle,
            CacheRecords::P,
        ])
        .from(CacheRecords::Table)
        .and_where(Expr::col(CacheRecords::Status).eq(status))
        .order_by(CacheRecords::DownloadTime, sea_query::Order::Desc)
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
            group_id: r.try_get("group_id")?,
            group_title: r.try_get("group_title")?,
            p: r.try_get::<i32, _>("p").unwrap_or(1),
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

/// 根据组ID查询缓存记录
pub async fn get_by_group_id(group_id: &str) -> Result<Vec<CacheRecord>> {
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
            CacheRecords::GroupId,
            CacheRecords::GroupTitle,
            CacheRecords::P,
        ])
        .from(CacheRecords::Table)
        .and_where(Expr::col(CacheRecords::GroupId).eq(group_id))
        .order_by(CacheRecords::P, sea_query::Order::Asc) // 按分P序号排序
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
            group_id: r.try_get("group_id")?,
            group_title: r.try_get("group_title")?,
            p: r.try_get::<i32, _>("p").unwrap_or(1),
        });
    }
    Ok(records)
}
/// 根据缓存路径查询缓存记录
pub async fn get_by_cache_path(cache_path: &str) -> Result<Option<CacheRecord>> {
    let pool = get_db().await?;
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
            CacheRecords::GroupId,
            CacheRecords::GroupTitle,
            CacheRecords::P,
        ])
        .from(CacheRecords::Table)
        .and_where(Expr::col(CacheRecords::CachePath).eq(cache_path))
        .build_sqlx(SqliteQueryBuilder);

    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;

    if let Some(r) = rows.first() {
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
            group_id: r.try_get("group_id")?,
            group_title: r.try_get("group_title")?,
            p: r.try_get::<i32, _>("p").unwrap_or(1),
        }))
    } else {
        Ok(None)
    }
}
