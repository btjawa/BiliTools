use serde::{ser::SerializeStruct, Deserialize, Serialize, Serializer};
use tauri::http::StatusCode;
use std::fmt;
use specta::Type;

pub type TauriResult<T> = Result<T, TauriError>;

#[derive(Debug, Clone, Deserialize, Copy, Type)]
pub enum AnyInt {
    I128(i128),
    U128(u128),
}

impl fmt::Display for AnyInt {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match *self {
            AnyInt::I128(v) => write!(f, "{v}"),
            AnyInt::U128(v) => write!(f, "{v}"),
        }
    }
}

impl Serialize for AnyInt {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match *self {
            AnyInt::I128(v) => serializer.serialize_i128(v),
            AnyInt::U128(v) => serializer.serialize_u128(v),
        }
    }
}

macro_rules! impl_from_signed {
    ($($t:ty),* $(,)?) => {$(
        impl From<$t> for AnyInt {
            #[inline] fn from(v: $t) -> Self { AnyInt::I128(v as i128) }
        }
    )*};
}
macro_rules! impl_from_unsigned {
    ($($t:ty),* $(,)?) => {$(
        impl From<$t> for AnyInt {
            #[inline] fn from(v: $t) -> Self { AnyInt::U128(v as u128) }
        }
    )*};
}

impl_from_signed!(i8, i16, i32, i64, i128, isize);
impl_from_unsigned!(u8, u16, u32, u64, u128, usize);

impl From<StatusCode> for AnyInt {
    #[inline]
    fn from(code: StatusCode) -> Self {
        AnyInt::U128(code.as_u16() as u128)
    }
}

#[derive(Debug, Type)]
pub struct TauriError {
    pub code: Option<AnyInt>,
    pub message: String,
}

impl TauriError {
    pub fn new<N>(message: impl Into<String>, code: Option<N>) -> Self
    where
        N: Into<AnyInt>
    {
        Self {
            code: code.map(|c| c.into()),
            message: message.into()
        }
    }
}

impl Serialize for TauriError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("TauriError", 2)?;
        state.serialize_field("code", &self.code)?;
        state.serialize_field("message", &self.message)?;
        state.end()
    }
}

impl fmt::Display for TauriError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.code {
            Some(code) => write!(f, "({}) {}", code, self.message),
            None => write!(f, "{}", self.message),
        }
    }
}

impl<E> From<E> for TauriError
where
    E: Into<anyhow::Error>,
{
    fn from(err: E) -> Self {
        Self::new(err.into().to_string_chain(), Option::<isize>::None)
    }
}

trait AnyhowErrorToStringChain {
    fn to_string_chain(&self) -> String;
}

// Modefied from https://github.com/lanyeeee/bilibili-manga-downloader/blob/main/src-tauri/src/extensions.rs
impl AnyhowErrorToStringChain for anyhow::Error {
    fn to_string_chain(&self) -> String {
        self.chain()
            .enumerate()
            .map(|(i, e)| {
                if i == 0 {
                    format!("{e}")
                } else {
                    format!("    {i}: {e}")
                }
            })
            .collect::<Vec<_>>()
            .join("\n")
    }
}