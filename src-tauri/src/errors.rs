use regex::Regex;
use serde::{ser::SerializeStruct, Deserialize, Serialize};
use specta::Type;
use std::backtrace::Backtrace;
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
            stack: TauriError::format_backtrace(None),
        }
    }
    fn from_anyhow(err: anyhow::Error) -> Self {
        Self {
            code: None,
            message: err.to_string(),
            stack: TauriError::format_backtrace(Some(err)),
        }
    }

    fn format_backtrace(err: Option<anyhow::Error>) -> String {
        let mut lines = Vec::new();

        let bt = if let Some(err) = err {
            for (i, l) in err.chain().enumerate().skip(1) {
                lines.push(format!("    {i}: {l}"));
            }
            format!("{}", err.backtrace())
        } else {
            format!("{}", Backtrace::force_capture())
        };

        let re = Regex::new(
            r"(?m)^\s*(\d+):\s+(bilitools_lib[^\n]+)\n\s+at\s+([^\n:]+):(\d+)(?::(\d+))?",
        )
        .expect("Failed to create backtrace regex");

        for cap in re.captures_iter(&bt) {
            let func = cap[2].trim().to_string();
            let file = cap[3].trim().replace("./", "").replace(".\\", "");
            let line = cap[4].parse::<usize>().unwrap_or_default();
            lines.push(format!("    at {file}:{line} ({func})"));
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
