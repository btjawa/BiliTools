use std::{env, fs, path::PathBuf, process::Command};
fn main() {
    let git_hash = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output()
        .ok()
        .and_then(|r| String::from_utf8(r.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or("unknown".into());
    println!("cargo:rustc-env=GIT_HASH={}", git_hash);

    #[cfg(debug_assertions)]
    {
        let out = PathBuf::from("./target/debug");
        let arch = env::var("CARGO_CFG_TARGET_ARCH").expect("No arch found");
        let os = env::var("CARGO_CFG_TARGET_OS").expect("No os found");
        let env = env::var("CARGO_CFG_TARGET_ENV").expect("No env found");
        let binaries = ["aria2c", "ffmpeg", "DanmakuFactory"];

        let _ = fs::create_dir_all(&out);
        for bin in binaries {
            let src = format!("./binaries/{bin}-{arch}-{os}-{env}");
            let _ = fs::copy(src, out.join("aria2c"));
        }
    }

    tauri_build::build()
}
