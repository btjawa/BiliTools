use serde::{ser::SerializeStruct, Serialize};
use std::fmt;
use specta::Type;

pub type TauriResult<T> = Result<T, TauriError>;

#[derive(Debug, Type)]
pub struct TauriError {
    pub code: Option<isize>,
    pub message: String,
}

impl TauriError {
    pub fn new(message: impl Into<String>, code: Option<isize>) -> Self {
        Self {
            code,
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
        Self::new(err.into().to_string_chain(), None)
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