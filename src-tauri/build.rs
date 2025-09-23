fn main() {
    let git_hash = std::process::Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output()
        .ok()
        .and_then(|r| String::from_utf8(r.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or("unknown".into());
    println!("cargo:rustc-env=GIT_HASH={}", git_hash);
    tauri_build::build()
}
