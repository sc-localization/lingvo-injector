import { FunctionComponent, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

// Список языков для выбора на фронтенде
const languages = [
  {
    name: 'Русский (Russian)',
    code: 'korean_(south_korea)',
    isRecommended: true,
  }, // Используем Korean по запросу
  { name: 'Chinese (Simplified)', code: 'chinese_(simplified)' },
  { name: 'Chinese (Traditional)', code: 'chinese_(traditional)' },
  { name: 'English', code: 'english' },
  { name: 'French (France)', code: 'french_(france)' },
  { name: 'German (Germany)', code: 'german_(germany)' },
  { name: 'Italian (Italy)', code: 'italian_(italy)' },
  { name: 'Japanese (Japan)', code: 'japanese_(japan)' },
  { name: 'Korean (South Korea)', code: 'korean_(south_korea)' },
  { name: 'Polish (Poland)', code: 'polish_(poland)' },
  { name: 'Portuguese (Brazil)', code: 'portuguese_(brazil)' },
  { name: 'Spanish (Latin America)', code: 'spanish_(latin_america)' },
  { name: 'Spanish (spain)', code: 'spanish_(spain)' },
];

// Типы для настроек
interface AppSettings {
  base_folder_path?: string;
  selected_language_code?: string;
}

const App: FunctionComponent = () => {
  const [folder, setFolder] = useState<string | null>(null);

  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>(
    languages[0].code
  );

  const [loading, setLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  /**
   * Запись настроек в файл (Rust)
   */
  const saveSettings = async (settings: AppSettings) => {
    try {
      const settingsJson = JSON.stringify(settings);
      await invoke('write_settings', { settingsJson: settingsJson });
    } catch (error) {
      console.error('Ошибка записи настроек:', error);
    }
  };

  // Автоматический поиск и загрузка сохраненных настроек при загрузке
  useEffect(() => {
    const handleInitialLoad = async () => {
      setLoading(true);
      setMessage({
        type: 'info',
        text: 'Загрузка настроек и поиск папки Star Citizen...',
      });

      let foundPath: string | null = null;
      let loadedLanguageCode: string | undefined = undefined;

      try {
        // 1. Читаем сохраненные настройки
        const settingsJson = await invoke<string>('read_settings');
        const settings: AppSettings = JSON.parse(settingsJson);

        if (settings.base_folder_path) {
          foundPath = settings.base_folder_path;
        }

        if (settings.selected_language_code) {
          loadedLanguageCode = settings.selected_language_code;
        }

        // 2. Если путь не найден в настройках, ищем автоматически
        if (!foundPath) {
          const autoFoundPath = await invoke<string | null>(
            'try_auto_find_base_folder'
          );
          if (autoFoundPath) {
            foundPath = autoFoundPath;
          }
        }

        // 3. Устанавливаем состояния
        if (foundPath) {
          setFolder(foundPath);
          // Сохраняем найденный/загруженный путь (на случай если это свежий автопоиск)
          await saveSettings({
            base_folder_path: foundPath,
            selected_language_code: loadedLanguageCode,
          });
        }

        if (
          loadedLanguageCode &&
          languages.some((l) => l.code === loadedLanguageCode)
        ) {
          setSelectedLanguageCode(loadedLanguageCode);
        }
      } catch (error) {
        console.error('Ошибка при начальной загрузке:', error);
        setMessage({ type: 'error', text: `Ошибка загрузки/поиска: ${error}` });
      } finally {
        setInitialLoadComplete(true);
        setLoading(false);
        if (foundPath) {
          setMessage({
            type: 'success',
            text: `Базовая папка найдена: ${foundPath}`,
          });
        } else {
          setMessage({
            type: 'info',
            text: 'Базовая папка не найдена. Пожалуйста, выберите ее вручную.',
          });
        }
      }
    };
    handleInitialLoad();
  }, []); // Пустой массив зависимостей для выполнения только один раз

  // Обновление настроек при смене языка/папки (для сохранения)
  useEffect(() => {
    if (initialLoadComplete) {
      // Сохраняем путь и код языка, если они доступны
      saveSettings({
        base_folder_path: folder || undefined,
        selected_language_code: selectedLanguageCode,
      });
    }
  }, [folder, selectedLanguageCode, initialLoadComplete]);

  const handleSelectFolder = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        directory: true,
        title:
          'Выберите базовую папку Star Citizen (например, .../Roberts Space Industries/StarCitizen)',
      });

      if (selectedPath) {
        setFolder(selectedPath);
        setMessage({
          type: 'info',
          text: `Выбрана базовая папка: ${selectedPath}`,
        });
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      setMessage({ type: 'error', text: `Ошибка выбора папки: ${error}` });
    }
  };

  const handleInstall = async () => {
    if (!folder) {
      setMessage({
        type: 'error',
        text: 'Пожалуйста, выберите базовую папку Star Citizen.',
      });
      return;
    }
    setLoading(true);
    setMessage({ type: 'info', text: 'Начинаем установку локализации...' });

    try {
      // 1. Настройка user.cfg и создание папки локализации
      const targetLocalizationPath = await invoke('set_language_config', {
        baseFolderPath: folder,
        selectedLanguageCode: selectedLanguageCode,
      });

      // 2. Скачивание и сохранение файла перевода (глобальный файл)
      const fileName = 'translation.ini'; // Имя файла перевода на сервере
      // Путь для сохранения: [folder]/[selectedLanguageCode]/global.ini
      const targetFilePath = `${targetLocalizationPath}/global111.ini`.replace(
        /\\/g,
        '/'
      );
      const serverUrl = `${import.meta.env.VITE_SERVER_URL}/translations/${fileName}`;

      const response = await fetch(serverUrl);

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const fileContent = await response.text();

      // Invoke the Tauri command to write the file
      await invoke('write_text_file', {
        path: targetFilePath,
        content: fileContent,
      });

      setMessage({
        type: 'success',
        text: 'Установка завершена!',
      });
    } catch (error) {
      console.error('Error during installation:', error);
      setMessage({ type: 'error', text: `Ошибка установки: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!folder) {
      setMessage({
        type: 'error',
        text: 'Базовая папка не выбрана. Удаление невозможно.',
      });
      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: 'Начинаем удаление локализации...' });

    try {
      // 1. Вызываем команду Rust для удаления
      await invoke('remove_localization', {
        base_folder_path: folder,
        selectedLanguageCode: selectedLanguageCode,
      });

      // 2. Сброс настроек
      // Сохраняем путь к папке (чтобы не искать заново), но сбрасываем код языка
      await saveSettings({
        base_folder_path: folder,
        selected_language_code: undefined,
      });

      setMessage({
        type: 'success',
        text: 'Удаление локализации завершено. Папка удалена, строка g_language удалена из user.cfg.',
      });
    } catch (error) {
      console.error('Error during removal:', error);
      setMessage({ type: 'error', text: `Ошибка удаления: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header>
        <h1>Star Citizen Localization Manager</h1>
      </header>

      {/* Status Message Area */}
      {message && <div>{message.text}</div>}

      {/* Selected Folder Display */}
      {folder && (
        <div>
          <span>Базовая папка игры:</span> {folder}
        </div>
      )}

      {/* Language Selection */}
      <div>
        <label htmlFor="language-select">Выберите язык перевода:</label>
        <select
          id="language-select"
          value={selectedLanguageCode}
          onChange={(e) => setSelectedLanguageCode(e.target.value)}
          disabled={loading}
        >
          {languages.map((lang, idx) => (
            <option key={lang.code + idx} value={lang.code}>
              {lang.name} {lang.isRecommended ? '(Рекомендуется)' : ''}
            </option>
          ))}
        </select>
        {selectedLanguageCode === 'korean_(south_korea)' && (
          <p>
            Используется системный код `&apos;`korean_(south_korea)`&apos;` для
            активации русского перевода.
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div>
        <button onClick={handleSelectFolder} disabled={loading}>
          {folder
            ? 'Выбрать другую базовую папку'
            : 'Выбрать базовую папку вручную'}
        </button>

        <button onClick={handleInstall} disabled={!folder || loading}>
          {loading ? 'Установка...' : 'Установить Локализацию'}
        </button>

        <button onClick={handleRemove} disabled={!folder || loading}>
          Удалить Локализацию
        </button>
      </div>
    </div>
  );
};

export default App;
