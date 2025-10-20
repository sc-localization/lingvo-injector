use regex::Regex;
use std::{env, fs, path::PathBuf};

/// Get the path to the configuration file (config.json)
fn get_config_path() -> Result<PathBuf, String> {
    let mut exe_path =
        env::current_exe().map_err(|e| format!("Failed to get current executable path: {}", e))?;
    exe_path.pop();
    let config_path = exe_path.join("config.json");
    println!("DEBUG: Config file path used: {:?}", config_path);
    Ok(config_path)
}

/// This function reads the settings from the config.json file.
#[tauri::command]
fn read_settings() -> Result<String, String> {
    let path = get_config_path()?;
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| format!("Failed to read settings file: {}", e))
    } else {
        Ok(r#"{}"#.to_string())
    }
}

/// Write settings to config.json
#[tauri::command]
fn write_settings(settings_json: String) -> Result<(), String> {
    let path = get_config_path()?;
    if let Some(parent_dir) = path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|e| format!("Failed to create parent directories for config file: {}", e))?;
    }
    fs::write(&path, settings_json).map_err(|e| format!("Failed to write settings file: {}", e))
}

/// Write text to a file
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    let normalized_path = path.replace('/', "\\");
    let file_path = PathBuf::from(&normalized_path);
    if let Some(parent_dir) = file_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|e| format!("Failed to create parent directories for file: {}", e))?;
    }
    fs::write(&file_path, content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

/// Find base game forlder form log file
fn find_base_folder_from_log() -> Result<Option<PathBuf>, String> {
    let appdata_os_string = env::var_os("APPDATA").ok_or_else(|| {
        "Could not read APPDATA environment variable. Is the OS Windows?".to_string()
    })?;
    let log_path = PathBuf::from(appdata_os_string)
        .join("rsilauncher")
        .join("logs")
        .join("log.log");

    if !log_path.exists() {
        return Ok(None);
    }

    let re = Regex::new(r#"Launching Star Citizen (?:LIVE|PTU|HOTFIX) from \((.*?)\)"#)
        .map_err(|e| format!("Regex compilation failed: {}", e))?;
    let log_content =
        fs::read_to_string(&log_path).map_err(|e| format!("Failed to read log file: {}", e))?;

    for line in log_content.lines().rev() {
        if let Some(captures) = re.captures(line) {
            if let Some(path_match) = captures.get(1) {
                let full_version_path = PathBuf::from(path_match.as_str());
                let base_folder = full_version_path.parent().map(|p| p.to_path_buf());
                return Ok(base_folder);
            }
        }
    }
    Ok(None)
}

/// Search for the base game folder
#[tauri::command]
fn try_auto_find_base_folder() -> Result<Option<String>, String> {
    let base_sc_folder_from_log =
        find_base_folder_from_log().map_err(|e| format!("Log file search error: {}", e))?;
    let mut potential_base_paths: Vec<PathBuf> = base_sc_folder_from_log.into_iter().collect();

    if potential_base_paths.is_empty() {
        let target_sc_segments = PathBuf::from("Roberts Space Industries").join("StarCitizen");
        potential_base_paths.push(PathBuf::from("C:\\Program Files").join(&target_sc_segments));
        potential_base_paths
            .push(PathBuf::from("C:\\Program Files (x86)").join(&target_sc_segments));
        potential_base_paths.push(PathBuf::from("C:\\").join(&target_sc_segments));
        potential_base_paths.push(PathBuf::from("D:\\").join(&target_sc_segments));
        potential_base_paths.push(PathBuf::from("E:\\").join(&target_sc_segments));
        potential_base_paths.push(PathBuf::from("F:\\").join(&target_sc_segments));
    }

    for base_path in potential_base_paths {
        if base_path.exists() && base_path.is_dir() {
            return Ok(Some(base_path.to_string_lossy().to_string()));
        }
    }
    Ok(None)
}

/// Команда для настройки user.cfg и создания папки локализации
#[tauri::command]
fn set_language_config(
    base_folder_path: String,
    selected_language_code: String,
) -> Result<String, String> {
    let base_path = PathBuf::from(&base_folder_path);

    // 1. Определяем актуальную папку версии (LIVE, PTU, HOTFIX)
    let versions = ["LIVE", "PTU", "HOTFIX"];
    let mut version_folder: Option<PathBuf> = None;

    for version in versions.iter() {
        let path = base_path.join(version);
        // Проверяем, что папка существует и внутри нее есть data
        if path.exists() && path.is_dir() && path.join("data").is_dir() {
            version_folder = Some(path);
            break;
        }
    }

    let version_folder = version_folder.ok_or_else(|| {
        format!(
            "Could not find any active game version folder (LIVE/PTU/HOTFIX) inside: {:?}",
            base_path
        )
    })?;

    let user_cfg_path = version_folder.join("user.cfg");
    let loc_path = version_folder.join("data").join("Localization");
    let new_cfg_line = format!("g_language = {}", selected_language_code);
    let original_content = fs::read_to_string(&user_cfg_path).unwrap_or_else(|_| String::new());
    let mut new_content = String::new();

    let re = Regex::new(r"(?m)^g_language\s*=\s*.*$")
        .map_err(|e| format!("Regex compilation failed: {}", e))?;

    if re.is_match(&original_content) {
        new_content = re
            .replace(&original_content, new_cfg_line.as_str())
            .to_string();
    } else {
        new_content.push_str(&original_content);
        if !new_content.ends_with('\n') && !new_content.is_empty() {
            new_content.push('\n');
        }
        new_content.push_str(new_cfg_line.as_str());
        new_content.push('\n');
    }

    fs::write(&user_cfg_path, new_content)
        .map_err(|e| format!("Failed to write to user.cfg at {:?}: {}", user_cfg_path, e))?;

    let new_loc_folder_path = loc_path.join(&selected_language_code);
    fs::create_dir_all(&new_loc_folder_path).map_err(|e| {
        format!(
            "Failed to create localization folder at {:?}: {}",
            new_loc_folder_path, e
        )
    })?;

    Ok(new_loc_folder_path.to_string_lossy().to_string())
}

/// Remove localization and user.cfg clear
#[tauri::command]
fn remove_localization(
    base_folder_path: String,
    selected_language_code: String,
    selected_version: String,
) -> Result<(), String> {
    let base_path = PathBuf::from(&base_folder_path);

    // 1. Определяем актуальную папку версии (LIVE, PTU, HOTFIX)
    let versions = ["LIVE", "PTU", "HOTFIX"];
    let mut version_folder: Option<PathBuf> = None;

    for version in versions.iter() {
        let path = base_path.join(version);
        if path.exists() && path.is_dir() && path.join("data").is_dir() {
            version_folder = Some(path);
            break;
        }
    }

    let version_folder = version_folder.ok_or_else(|| {
        format!(
            "Could not find any active game version folder (LIVE/PTU/HOTFIX) inside: {:?}",
            base_path
        )
    })?;

    let user_cfg_path = version_folder.join("user.cfg");
    let loc_folder_path = version_folder
        .join("data")
        .join("Localization")
        .join(&selected_language_code);

    if loc_folder_path.exists() {
        fs::remove_dir_all(&loc_folder_path).map_err(|e| {
            format!(
                "Failed to delete localization folder at {:?}: {}",
                loc_folder_path, e
            )
        })?;
    }

    if user_cfg_path.exists() {
        let original_content = fs::read_to_string(&user_cfg_path)
            .map_err(|e| format!("Failed to read user.cfg for removal: {}", e))?;
        let re = Regex::new(r"(?m)\r?\n?g_language\s*=\s*.*$")
            .map_err(|e| format!("Regex compilation failed: {}", e))?;
        let new_content = re.replace_all(&original_content, "").to_string();
        fs::write(&user_cfg_path, new_content)
            .map_err(|e| format!("Failed to write updated user.cfg: {}", e))?;
    }

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            write_text_file,
            try_auto_find_base_folder,
            find_available_versions,
            set_language_config,
            read_settings,
            write_settings,
            remove_localization
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
