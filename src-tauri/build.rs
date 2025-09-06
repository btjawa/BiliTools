use std::process::Command;
fn main() {
    let git_hash = Command::new("git").args(["rev-parse", "HEAD"]).output().ok()
        .and_then(|r| String::from_utf8(r.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or("unknown".into());
    println!("cargo:rustc-env=GIT_HASH={}", git_hash);

    #[cfg(all(target_os = "linux", debug_assertions))]
    {
        use std::{fs, path::PathBuf};
        let out = PathBuf::from("./target/debug");
        let _ = fs::create_dir_all(&out);
        let _ = fs::copy("./binaries/aria2c-x86_64-unknown-linux-gnu", out.join("aria2c"));
        let _ = fs::copy("./binaries/ffmpeg-x86_64-unknown-linux-gnu", out.join("ffmpeg"));
        let _ = fs::copy("./binaries/DanmakuFactory-x86_64-unknown-linux-gnu", out.join("DanmakuFactory"));
    }

    tauri_build::build()
}
