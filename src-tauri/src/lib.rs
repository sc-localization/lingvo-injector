use regex::Regex;
use std::{env, fs, path::PathBuf};
use tauri::command;

// --- CONFIGURATION HELPERS (Новые команды для хранения настроек) ---

/// Gets the path for the application configuration file (e.g., config.json next to the executable)
fn get_config_path() -> Result<PathBuf, String> {
    // В Tauri приложениях принято хранить конфиг рядом с исполняемым файлом
    let mut exe_path =
        env::current_exe().map_err(|e| format!("Failed to get current executable path: {}", e))?;

    // Навигация вверх от имени исполняемого файла к родительскому каталогу
    // Это приводит к .../target/debug/
    exe_path.pop();

    let config_path = exe_path.join("config.json");

    // !!! ВРЕМЕННЫЙ ВЫВОД ДЛЯ ОТЛАДКИ: Показывает, куда будет записан файл !!!
    println!("DEBUG: Config file path used: {:?}", config_path);
    // !!! КОНЕЦ ВРЕМЕННОГО ВЫВОДА !!!

    Ok(config_path)
}

// Reads settings from config.json
#[tauri::command]
fn read_settings() -> Result<String, String> {
    let path = get_config_path()?;
    if path.exists() {
        // Читаем файл
        fs::read_to_string(&path).map_err(|e| format!("Failed to read settings file: {}", e))
    } else {
        // Если файл не существует, возвращаем пустой JSON
        Ok(r#"{}"#.to_string())
    }
}

// Writes settings to config.json
#[tauri::command]
fn write_settings(settings_json: String) -> Result<(), String> {
    let path = get_config_path()?;
    // Создаем родительские каталоги, если их нет (для надежности)
    if let Some(parent_dir) = path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|e| format!("Failed to create parent directories for config file: {}", e))?;
    }
    // Записываем JSON-строку
    fs::write(&path, settings_json).map_err(|e| format!("Failed to write settings file: {}", e))
}

// --- ОСНОВНЫЕ КОМАНДЫ ---

/// Tauri command to write text to a file
#[command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    // Нормализуем разделители пути (заменяем '/' на '\' для Windows-путей)
    let normalized_path = path.replace('/', "\\");
    let file_path = PathBuf::from(&normalized_path);

    // Гарантируем, что родительская папка существует
    if let Some(parent_dir) = file_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|e| format!("Failed to create parent directories for file: {}", e))?;
    }

    fs::write(&file_path, content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

/// Вспомогательная функция для поиска базовой папки из лог-файла.
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

    // Проходим по строкам в обратном порядке для нахождения самой актуальной записи
    for line in log_content.lines().rev() {
        if let Some(captures) = re.captures(line) {
            if let Some(path_match) = captures.get(1) {
                let full_version_path = PathBuf::from(path_match.as_str());

                // Нам нужен путь до Roberts Space Industries\StarCitizen,
                // отбрасываем последнюю папку (LIVE/PTU/HOTFIX)
                let base_folder = full_version_path.parent().map(|p| p.to_path_buf());

                return Ok(base_folder);
            }
        }
    }

    Ok(None)
}

/// Главная команда для поиска БАЗОВОЙ папки игры (.../Roberts Space Industries/StarCitizen)
#[tauri::command]
fn try_auto_find_base_folder() -> Result<Option<String>, String> {
    // 1. Пытаемся найти путь из лог-файла лаунчера (наиболее надежный способ)
    let base_sc_folder_from_log =
        find_base_folder_from_log().map_err(|e| format!("Log file search error: {}", e))?;

    let mut potential_base_paths: Vec<PathBuf> = base_sc_folder_from_log.into_iter().collect();

    // 2. Добавляем стандартные пути, если поиск по логу не дал результата
    if potential_base_paths.is_empty() {
        let target_sc_segments = PathBuf::from("Roberts Space Industries").join("StarCitizen");

        // Добавляем стандартные пути установки
        potential_base_paths.push(PathBuf::from("C:\\Program Files").join(&target_sc_segments));
        potential_base_paths
            .push(PathBuf::from("C:\\Program Files (x86)").join(&target_sc_segments));

        // Добавляем пути в корне дисков (включая F:)
        potential_base_paths.push(PathBuf::from("C:\\").join(&target_sc_segments));
        potential_base_paths.push(PathBuf::from("D:\\").join(&target_sc_segments));
        potential_base_paths.push(PathBuf::from("E:\\").join(&target_sc_segments));
        potential_base_paths.push(PathBuf::from("F:\\").join(&target_sc_segments));
    }

    // 3. Проверяем, существует ли базовая папка игры
    for base_path in potential_base_paths {
        if base_path.exists() && base_path.is_dir() {
            return Ok(Some(base_path.to_string_lossy().to_string()));
        }
    }

    // Ничего не найдено
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

    // 4. Содержимое для записи/обновления
    let new_cfg_line = format!("g_language = {}", selected_language_code);

    // 5. Читаем user.cfg, если он существует, или используем пустую строку
    let original_content = fs::read_to_string(&user_cfg_path).unwrap_or_else(|_| String::new());

    let mut new_content = String::new();

    // Регулярное выражение для поиска существующей строки g_language.
    let re = Regex::new(r"(?m)^g_language\s*=\s*.*$")
        .map_err(|e| format!("Regex compilation failed: {}", e))?;

    if re.is_match(&original_content) {
        // Заменяем существующую строку
        new_content = re
            .replace(&original_content, new_cfg_line.as_str())
            .to_string();
    } else {
        // Если строки нет, добавляем ее в конец
        new_content.push_str(&original_content);
        if !new_content.ends_with('\n') && !new_content.is_empty() {
            new_content.push('\n');
        }
        new_content.push_str(new_cfg_line.as_str());
        new_content.push('\n');
    }

    // 6. Записываем обновленное содержимое обратно в user.cfg
    fs::write(&user_cfg_path, new_content)
        .map_err(|e| format!("Failed to write to user.cfg at {:?}: {}", user_cfg_path, e))?;

    // 7. Создаем папку локализации
    let new_loc_folder_path = loc_path.join(&selected_language_code);

    fs::create_dir_all(&new_loc_folder_path).map_err(|e| {
        format!(
            "Failed to create localization folder at {:?}: {}",
            new_loc_folder_path, e
        )
    })?;

    // 8. Возвращаем полный путь к созданной папке
    Ok(new_loc_folder_path.to_string_lossy().to_string())
}

/// Команда для удаления локализации и очистки user.cfg
#[tauri::command]
fn remove_localization(
    base_folder_path: String,
    selected_language_code: String,
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

    // --- 1. Удаление папки локализации ---
    if loc_folder_path.exists() {
        // Удаляем папку рекурсивно
        fs::remove_dir_all(&loc_folder_path).map_err(|e| {
            format!(
                "Failed to delete localization folder at {:?}: {}",
                loc_folder_path, e
            )
        })?;
    }

    // --- 2. Удаление строки g_language из user.cfg ---
    if user_cfg_path.exists() {
        let original_content = fs::read_to_string(&user_cfg_path)
            .map_err(|e| format!("Failed to read user.cfg for removal: {}", e))?;

        // Регулярное выражение для поиска строки g_language и ее удаления (включая перевод строки).
        // Добавлен нежадный поиск `.*?` и обработка `\r` для надежности
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
            set_language_config,
            read_settings,       // Добавлено для сохранения настроек
            write_settings,      // Добавлено для сохранения настроек
            remove_localization  // Добавлено для удаления локализации
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
