use std::{net::{SocketAddr, TcpListener}, process::{Child, Command, Stdio, self}, sync::{Arc, RwLock}};
use lazy_static::lazy_static;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use crate::{SECRET, CURRENT_BIN};

lazy_static! {
    pub static ref ARIA2C_PORT: Arc<RwLock<usize>> = Arc::new(RwLock::new(0));
    pub static ref ARIA2C_CHILD: Arc<RwLock<Option<Child>>> = Arc::new(RwLock::new(None));
    pub static ref MAX_CONC_DOWNS: Arc<RwLock<i64>> = Arc::new(RwLock::new(3));
}

pub fn init() -> Result<(), String> {
    let start_port = 6800;
    let end_port = 65535;
    let port = (start_port..end_port)
        .find_map(|port| TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).ok())
        .ok_or("No free port found".to_string())?.local_addr().unwrap().port();
    *ARIA2C_PORT.write().unwrap() = port as usize;
    let mut command = Command::new(CURRENT_BIN.join(
        if cfg!(target_os = "windows") { "aria2c.exe" } else { "aria2c" }
    ).clone());
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    command.current_dir(CURRENT_BIN.clone())
        .arg(format!("--conf-path={}", CURRENT_BIN.join("aria2.conf").to_string_lossy()))
        .arg(format!("--rpc-listen-port={}", port))
        .arg(format!("--rpc-secret={}", SECRET.read().unwrap().clone()))
        .arg(format!("--max-concurrent-downloads={}", MAX_CONC_DOWNS.read().unwrap()))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let child = command.spawn().map_err(|e| e.to_string())?;
    let pid = child.id();
    *ARIA2C_CHILD.write().unwrap() = Some(child);
    #[cfg(target_os = "windows")]
    Command::new("powershell.exe")
        .creation_flags(0x08000000)
        .arg("-Command")
        .arg(format!(
            "while ((Get-Process -Id {} -ErrorAction SilentlyContinue) -ne $null) \
            {{ Start-Sleep -Milliseconds 500 }}; Stop-Process -Id {} -Force",
            process::id(),
            pid
        ))
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    Command::new("/bin/bash")
        .arg("-c")
        .arg(format!(
            "while kill -0 {} 2>/dev/null; do sleep 0.5; done; kill {}",
            process::id(),
            pid
        ))
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn kill() -> Result<(), String> {
    if let Some(ref mut sc) = *ARIA2C_CHILD.write().unwrap() {
        sc.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
