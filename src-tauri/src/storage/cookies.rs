use anyhow::{Context, Result};
use regex::Regex;
use sea_query::{
    ColumnDef, Expr, Iden, OnConflict, Query, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_query_binder::SqlxBinder;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::BTreeMap;
use time::{macros::format_description, PrimitiveDateTime};

use crate::storage::db::{get_db, TableSpec};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CookieRow {
    pub name: String,
    pub value: String,
    pub path: Option<String>,
    pub domain: Option<String>,
    pub expires: Option<i64>,
    pub httponly: bool,
    pub secure: bool,
}

#[derive(Iden)]
pub enum Cookies {
    Table,
    Name,
    Value,
    Path,
    Domain,
    Expires,
    Httponly,
    Secure,
}

pub struct CookiesTable;

impl TableSpec for CookiesTable {
    const NAME: &'static str = "cookies";
    const LATEST: i32 = 1;
    fn create_stmt() -> TableCreateStatement {
        Table::create()
            .table(Cookies::Table)
            .col(
                ColumnDef::new(Cookies::Name)
                    .text()
                    .not_null()
                    .primary_key(),
            )
            .col(ColumnDef::new(Cookies::Value).text().not_null())
            .col(ColumnDef::new(Cookies::Path).text().null())
            .col(ColumnDef::new(Cookies::Domain).text().null())
            .col(ColumnDef::new(Cookies::Expires).integer().null())
            .col(ColumnDef::new(Cookies::Httponly).boolean().not_null())
            .col(ColumnDef::new(Cookies::Secure).boolean().not_null())
            .to_owned()
    }
}

pub async fn load() -> Result<BTreeMap<String, String>> {
    let (sql, values) = Query::select()
        .columns([Cookies::Name, Cookies::Value])
        .from(Cookies::Table)
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    let rows = sqlx::query_with(&sql, values).fetch_all(&pool).await?;

    let mut result = BTreeMap::new();
    for r in rows {
        let n: String = r.try_get("name")?;
        let v: String = r.try_get("value")?;
        result.insert(n, v);
    }
    Ok(result)
}

pub async fn insert(cookie: String) -> Result<()> {
    let re = Regex::new(r"([^=;\s]+)=?([^;]*)").context("Invalid Cookie")?;

    let mut row = CookieRow {
        name: Default::default(),
        value: Default::default(),
        path: None,
        domain: None,
        expires: None,
        httponly: false,
        secure: false,
    };

    for (idx, cap) in re.captures_iter(&cookie).enumerate() {
        let key = cap
            .get(1)
            .map(|v| v.as_str().trim().to_string())
            .context("No key found in cookie")?;
        let value = cap
            .get(2)
            .map(|v| v.as_str().trim().to_string())
            .unwrap_or_default();

        if idx == 0 {
            row.name = key;
            row.value = value;
            continue;
        }

        match key.as_str() {
            "path" => row.path = Some(value),
            "domain" => row.domain = Some(value),
            "expires" => {
                let fmt = format_description!(
                    "[weekday repr:short], [day] [month repr:short] [year] [hour]:[minute]:[second] GMT"
                );
                let timestamp = PrimitiveDateTime::parse(&value, &fmt)?
                    .assume_utc()
                    .unix_timestamp();
                row.expires = Some(timestamp);
            }
            "httponly" => row.httponly = true,
            "secure" => row.secure = true,
            _ => continue,
        }
    }

    let (sql, values) = Query::insert()
        .into_table(Cookies::Table)
        .columns([
            Cookies::Name,
            Cookies::Value,
            Cookies::Path,
            Cookies::Domain,
            Cookies::Expires,
            Cookies::Httponly,
            Cookies::Secure,
        ])
        .values([
            row.name.into(),
            row.value.into(),
            row.path.into(),
            row.domain.into(),
            row.expires.into(),
            row.httponly.into(),
            row.secure.into(),
        ])?
        .on_conflict(
            OnConflict::column(Cookies::Name)
                .update_columns([
                    Cookies::Name,
                    Cookies::Value,
                    Cookies::Path,
                    Cookies::Domain,
                    Cookies::Expires,
                    Cookies::Httponly,
                    Cookies::Secure,
                ])
                .to_owned(),
        )
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}

pub async fn delete(name: String) -> Result<()> {
    let (sql, values) = Query::delete()
        .from_table(Cookies::Table)
        .cond_where(Expr::col(Cookies::Name).eq(&name))
        .build_sqlx(SqliteQueryBuilder);

    let pool = get_db().await?;
    sqlx::query_with(&sql, values).execute(&pool).await?;
    Ok(())
}
