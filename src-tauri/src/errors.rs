use backtrace::Backtrace;
use serde::{ser::SerializeStruct, Deserialize, Serialize};
use specta::Type;
use std::fmt;
use tauri::http::StatusCode;

pub type TauriResult<T> = Result<T, TauriError>;

#[derive(Debug, Clone, Serialize, Deserialize, Copy, Type)]
#[serde(untagged)]
pub enum AnyInt {
    I(isize),
    U(usize),
}

macro_rules! impl_from_signed {
    ($($t:ty),* $(,)?) => {$(
        impl From<$t> for AnyInt {
            fn from(v: $t) -> Self { AnyInt::I(v as isize) }
        }
    )*};
}
macro_rules! impl_from_unsigned {
    ($($t:ty),* $(,)?) => {$(
        impl From<$t> for AnyInt {
            fn from(v: $t) -> Self { AnyInt::U(v as usize) }
        }
    )*};
}

impl_from_signed!(i8, i16, i32, i64, isize);
impl_from_unsigned!(u8, u16, u32, u64, usize);

impl From<StatusCode> for AnyInt {
    fn from(v: StatusCode) -> Self {
        AnyInt::U(v.as_u16() as usize)
    }
}

impl AnyInt {
    pub fn as_isize(self) -> isize {
        match self {
            AnyInt::I(v) => v,
            AnyInt::U(v) => {
                if v > isize::MAX as usize {
                    isize::MAX
                } else {
                    v as isize
                }
            }
        }
    }
}

#[derive(Debug, Type)]
pub struct TauriError {
    pub code: Option<AnyInt>,
    pub message: String,
    pub stack: String,
}

impl TauriError {
    pub fn new<N>(message: impl Into<String>, code: Option<N>) -> Self
    where
        N: Into<AnyInt>,
    {
        Self {
            code: code.map(Into::into),
            message: message.into(),
            stack: TauriError::format_backtrace(Backtrace::new(), None),
        }
    }
    fn from_anyhow(err: anyhow::Error) -> Self {
        Self {
            code: None,
            message: err.to_string(),
            stack: TauriError::format_backtrace(Backtrace::new(), Some(err)),
        }
    }
    fn format_backtrace(bt: Backtrace, err: Option<anyhow::Error>) -> String {
        let mut lines = Vec::new();
        if let Some(e) = err {
            for (i, l) in e.chain().enumerate().skip(1) {
                lines.push(format!("    {i}: {l}"));
            }
        }
        for frame in bt.frames() {
            for sym in frame.symbols() {
                let Some(func) = sym.name().map(|v| v.to_string()) else {
                    continue;
                };
                if !func.starts_with("bilitools_lib") {
                    continue;
                }
                let Some(filename) = sym
                    .filename()
                    .and_then(|v| v.file_name().map(|v| v.to_string_lossy()))
                else {
                    continue;
                };
                if filename.starts_with("errors.rs") {
                    continue;
                }
                let line = sym.lineno();
                let col = sym.colno();
                let src = match (line, col) {
                    (Some(l), Some(c)) => format!("{filename}:{l}:{c}"),
                    (Some(l), None) => format!("{filename}:{l}"),
                    _ => filename.to_string(),
                };
                lines.push(format!("    at {src} ({func})"));
            }
        }
        lines.join("\n")
    }
}

impl fmt::Display for TauriError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.code {
            Some(v) => write!(f, "{} ({v:?})\n{}", self.message, self.stack),
            _ => write!(f, "{}\n{}", self.message, self.stack),
        }
    }
}

impl Serialize for TauriError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("TauriError", 3)?;
        state.serialize_field("code", &self.code)?;
        state.serialize_field("message", &self.message)?;
        state.serialize_field("stack", &self.stack)?;
        state.end()
    }
}

impl<E> From<E> for TauriError
where
    E: Into<anyhow::Error>,
{
    fn from(value: E) -> Self {
        TauriError::from_anyhow(value.into())
    }
}
