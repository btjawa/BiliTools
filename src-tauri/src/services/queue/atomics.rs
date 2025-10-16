use std::{
    fmt,
    marker::PhantomData,
    sync::atomic::{AtomicU8, Ordering::SeqCst},
};

use serde::{de::DeserializeOwned, Deserialize, Serialize};

use specta::Type;

pub struct Atomic<T> {
    inner: AtomicU8,
    _marker: PhantomData<T>,
}

impl<T> Atomic<T>
where
    T: Copy + From<u8> + Into<u8> + Serialize + DeserializeOwned,
{
    pub fn new(value: T) -> Self {
        Self {
            inner: AtomicU8::new(value.into()),
            _marker: PhantomData,
        }
    }
    pub fn get(&self) -> T {
        T::from(self.inner.load(SeqCst))
    }
    pub fn set(&self, value: T) {
        self.inner.store(value.into(), SeqCst);
    }
}

impl<T> fmt::Debug for Atomic<T>
where
    T: Copy + From<u8> + Into<u8> + Serialize + DeserializeOwned + fmt::Debug,
{
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_tuple("Atomic").field(&self.get()).finish()
    }
}

impl<T> fmt::Display for Atomic<T>
where
    T: Copy + From<u8> + Into<u8> + Serialize + DeserializeOwned + fmt::Debug,
{
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = serde_plain::to_string(&self.get()).unwrap_or_default();
        write!(f, "{}", s)
    }
}

// TYPE

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum QueueType {
    Backlog,
    Pending,
    Doing,
    Complete,
}

impl From<u8> for QueueType {
    fn from(value: u8) -> Self {
        use QueueType::*;
        match value {
            0 => Backlog,
            1 => Pending,
            2 => Doing,
            3 => Complete,
            _ => Backlog,
        }
    }
}

impl From<QueueType> for u8 {
    fn from(value: QueueType) -> Self {
        value as u8
    }
}

// STATE

#[repr(u8)]
#[derive(Clone, Debug, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum SchedulerState {
    Idle,
    Running,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

impl From<u8> for SchedulerState {
    fn from(value: u8) -> Self {
        use SchedulerState::*;
        match value {
            0 => Idle,
            1 => Running,
            2 => Paused,
            3 => Completed,
            4 => Failed,
            5 => Cancelled,
            _ => Idle,
        }
    }
}

impl From<SchedulerState> for u8 {
    fn from(value: SchedulerState) -> Self {
        value as u8
    }
}

#[repr(u8)]
#[derive(Clone, Debug, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum TaskState {
    Backlog,
    Pending,
    Active,
    Completed,
    Paused,
    Failed,
    Cancelled,
}

impl From<u8> for TaskState {
    fn from(value: u8) -> Self {
        use TaskState::*;
        match value {
            0 => Backlog,
            1 => Pending,
            2 => Active,
            3 => Completed,
            4 => Paused,
            5 => Failed,
            6 => Cancelled,
            _ => Backlog,
        }
    }
}

impl From<TaskState> for u8 {
    fn from(value: TaskState) -> Self {
        value as u8
    }
}
