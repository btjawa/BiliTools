//! 文件名处理和冲突解决模块
//!
//! 提供文件名冲突检测、自动重命名、特殊字符转换等功能。

use super::error::TransferError;
use super::types::ConflictStrategy;
use std::path::{Path, PathBuf};

/// 文件名处理器
pub struct FilenameHandler;

impl FilenameHandler {
    /// 检查目标路径是否存在
    pub fn path_exists(path: &Path) -> bool {
        path.exists()
    }

    /// 生成唯一的文件名（添加数字后缀）
    ///
    /// 如果目标文件已存在，自动在文件名后添加数字后缀
    /// 例如: file.txt -> file (1).txt -> file (2).txt
    pub fn generate_unique_filename(target_path: &Path) -> PathBuf {
        if !Self::path_exists(target_path) {
            return target_path.to_path_buf();
        }

        let parent = target_path.parent().unwrap_or_else(|| Path::new("."));
        let file_name = target_path.file_name().unwrap().to_string_lossy();

        // 分离文件名和扩展名
        let (name, ext) = Self::split_filename(&file_name);

        // 尝试找到不存在的文件名
        for i in 1..=10000 {
            let new_name = if ext.is_empty() {
                format!("{} ({})", name, i)
            } else {
                format!("{} ({}).{}", name, i, ext)
            };

            let new_path = parent.join(&new_name);
            if !Self::path_exists(&new_path) {
                return new_path;
            }
        }

        // 如果找不到唯一的名称，返回原始路径（不应该发生）
        target_path.to_path_buf()
    }

    /// 分离文件名和扩展名
    ///
    /// 返回 (文件名, 扩展名)
    fn split_filename(filename: &str) -> (String, String) {
        if let Some(dot_pos) = filename.rfind('.') {
            // 检查是否是隐藏文件（如 .gitignore）
            if dot_pos == 0 {
                return (filename.to_string(), String::new());
            }

            let (name, ext) = filename.split_at(dot_pos);
            // 移除前导的点
            (name.to_string(), ext[1..].to_string())
        } else {
            (filename.to_string(), String::new())
        }
    }

    /// 转换特殊字符为兼容的文件名
    ///
    /// 将不兼容的字符替换为下划线或其他安全字符
    pub fn sanitize_filename(filename: &str) -> String {
        // Windows 不允许的字符: < > : " / \ | ? *
        // 其他系统主要限制: / \0
        let invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*', '\0'];

        filename
            .chars()
            .map(|c| {
                if invalid_chars.contains(&c) || c.is_control() {
                    '_'
                } else {
                    c
                }
            })
            .collect::<String>()
            .trim()
            .to_string()
    }

    /// 转换路径中的特殊字符
    pub fn sanitize_path(path: &Path) -> PathBuf {
        let mut result = PathBuf::new();

        for component in path.components() {
            match component {
                std::path::Component::Prefix(prefix) => {
                    result.push(prefix.as_os_str());
                }
                std::path::Component::RootDir => {
                    result.push(component.as_os_str());
                }
                std::path::Component::Normal(name) => {
                    let sanitized = Self::sanitize_filename(&name.to_string_lossy());
                    result.push(sanitized);
                }
                std::path::Component::CurDir => {
                    result.push(".");
                }
                std::path::Component::ParentDir => {
                    result.push("..");
                }
            }
        }

        result
    }

    /// 处理文件名冲突
    ///
    /// 根据冲突策略处理已存在的文件
    pub fn handle_conflict(
        target_path: &Path,
        strategy: &ConflictStrategy,
    ) -> Result<PathBuf, TransferError> {
        match strategy {
            ConflictStrategy::Skip => Err(TransferError::FileNameConflict {
                file_name: target_path.to_string_lossy().to_string(),
            }),
            ConflictStrategy::Overwrite => Ok(target_path.to_path_buf()),
            ConflictStrategy::Rename => Ok(Self::generate_unique_filename(target_path)),
            ConflictStrategy::Ask => {
                // 这个策略需要用户交互，由调用者处理
                Err(TransferError::FileNameConflict {
                    file_name: target_path.to_string_lossy().to_string(),
                })
            }
        }
    }

    /// 验证文件名是否有效
    pub fn is_valid_filename(filename: &str) -> bool {
        if filename.is_empty() {
            return false;
        }

        // 检查是否只包含空格
        if filename.trim().is_empty() {
            return false;
        }

        // 检查是否包含无效字符
        let invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*', '\0'];
        !filename
            .chars()
            .any(|c| invalid_chars.contains(&c) || c.is_control())
    }

    /// 获取安全的文件名
    ///
    /// 清理文件名中的特殊字符，返回安全的文件名
    /// 如果文件名为空或只包含空格，返回错误
    pub fn get_safe_filename(filename: &str) -> Result<String, TransferError> {
        if filename.is_empty() || filename.trim().is_empty() {
            return Err(TransferError::FileNameConflict {
                file_name: filename.to_string(),
            });
        }

        Ok(Self::sanitize_filename(filename))
    }

    /// 获取安全的目标路径
    ///
    /// 清理路径中的特殊字符并处理冲突
    pub fn get_safe_target_path(
        target_path: &Path,
        strategy: &ConflictStrategy,
    ) -> Result<PathBuf, TransferError> {
        // 首先清理路径中的特殊字符
        let sanitized_path = Self::sanitize_path(target_path);

        // 然后处理冲突
        if Self::path_exists(&sanitized_path) {
            Self::handle_conflict(&sanitized_path, strategy)
        } else {
            Ok(sanitized_path)
        }
    }

    /// 检查文件是否为只读
    pub fn is_readonly(path: &Path) -> Result<bool, TransferError> {
        let metadata = std::fs::metadata(path)
            .map_err(|e| TransferError::from_io_error(e, Some(&path.to_string_lossy())))?;

        Ok(metadata.permissions().readonly())
    }

    /// 尝试修改文件权限为可写
    #[allow(clippy::permissions_set_readonly_false)]
    pub fn make_writable(path: &Path) -> Result<(), TransferError> {
        let mut perms = std::fs::metadata(path)
            .map_err(|e| TransferError::from_io_error(e, Some(&path.to_string_lossy())))?
            .permissions();

        perms.set_readonly(false);

        std::fs::set_permissions(path, perms)
            .map_err(|e| TransferError::from_io_error(e, Some(&path.to_string_lossy())))
    }

    /// 获取文件名（不包含路径）
    pub fn get_filename(path: &Path) -> String {
        path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default()
    }

    /// 获取文件扩展名
    pub fn get_extension(path: &Path) -> String {
        path.extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default()
    }

    /// 获取不含扩展名的文件名
    pub fn get_stem(path: &Path) -> String {
        path.file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default()
    }
}
