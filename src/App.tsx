import { FunctionComponent, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

const languages = [
  {
    name: 'Русский (Russian)',
    code: 'korean_(south_korea)',
    isRecommended: true,
  },
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

interface AppSettings {
  base_folder_path?: string;
  selected_language_code?: string;
  selected_version?: string;
}

const App: FunctionComponent = () => {
  const [baseGameFolder, setBaseGameFolder] = useState<string | null>(null);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>(
    languages[0].code
  );
  const [loading, setLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const saveSettings = async (settings: AppSettings) => {
    try {
      const settingsJson = JSON.stringify(settings);

      await invoke('write_settings', { settingsJson });
    } catch (error) {
      console.error('Ошибка записи настроек:', error);
    }
  };

  useEffect(() => {
    const handleInitialLoad = async () => {
      setLoading(true);
      setMessage({
        type: 'info',
        text: 'Загрузка настроек и поиск папки Star Citizen...',
      });

      let foundPath: string | null = null;
      let loadedLanguageCode: string | undefined = undefined;
      let loadedVersion: string | undefined = undefined;

      try {
        const settingsJson = await invoke<string>('read_settings');
        const settings: AppSettings = JSON.parse(settingsJson);

        if (settings.base_folder_path) foundPath = settings.base_folder_path;

        if (settings.selected_language_code)
          loadedLanguageCode = settings.selected_language_code;

        if (settings.selected_version)
          loadedVersion = settings.selected_version;

        if (!foundPath) {
          const autoFoundPath = await invoke<string | null>(
            'try_auto_find_base_folder'
          );

          if (autoFoundPath) foundPath = autoFoundPath;
        }

        if (foundPath) {
          setBaseGameFolder(foundPath);

          await saveSettings({
            base_folder_path: foundPath,
            selected_language_code: loadedLanguageCode,
            selected_version: loadedVersion,
          });

          const versions = await invoke<string[]>('find_available_versions', {
            baseFolderPath: foundPath,
          });

          setAvailableVersions(versions);

          if (loadedVersion && versions.includes(loadedVersion)) {
            setSelectedVersion(loadedVersion);
          } else if (versions.length > 0) {
            setSelectedVersion(versions[0]);
          }
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
  }, []);

  useEffect(() => {
    if (initialLoadComplete) {
      saveSettings({
        base_folder_path: baseGameFolder || undefined,
        selected_language_code: selectedLanguageCode,
        selected_version: selectedVersion || undefined,
      });
    }
  }, [
    baseGameFolder,
    selectedLanguageCode,
    selectedVersion,
    initialLoadComplete,
  ]);

  const handleSelectFolder = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        directory: true,
        title:
          'Выберите базовую папку Star Citizen (например, .../Roberts Space Industries/StarCitizen)',
      });

      if (selectedPath) {
        setBaseGameFolder(selectedPath);
        setMessage({
          type: 'info',
          text: `Выбрана базовая папка: ${selectedPath}`,
        });

        const versions = await invoke<string[]>('find_available_versions', {
          baseFolderPath: selectedPath,
        });

        setAvailableVersions(versions);

        if (versions.length > 0) setSelectedVersion(versions[0]);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      setMessage({ type: 'error', text: `Ошибка выбора папки: ${error}` });
    }
  };

  const handleInstall = async () => {
    if (!baseGameFolder) {
      setMessage({
        type: 'error',
        text: 'Пожалуйста, выберите базовую папку Star Citizen.',
      });

      return;
    }
    if (!selectedVersion) {
      setMessage({ type: 'error', text: 'Пожалуйста, выберите версию игры.' });

      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: 'Начинаем установку локализации...' });

    try {
      const targetLocalizationPath = await invoke('set_language_config', {
        baseFolderPath: baseGameFolder,
        selectedLanguageCode: selectedLanguageCode,
        selectedVersion,
      });

      const fileName = 'translation.ini';
      const targetFilePath = `${targetLocalizationPath}/global.ini`.replace(
        /\\/g,
        '/'
      );

      const serverUrl = `${import.meta.env.VITE_SERVER_URL}/translations/${selectedVersion}/${fileName}`;

      const response = await fetch(serverUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to download file for version ${selectedVersion}: ${response.statusText}`
        );
      }

      const fileContent = await response.text();

      await invoke('write_text_file', {
        path: targetFilePath,
        content: fileContent,
      });

      setMessage({ type: 'success', text: 'Установка завершена!' });
    } catch (error) {
      console.error('Error during installation:', error);
      setMessage({ type: 'error', text: `Ошибка установки: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!baseGameFolder || !selectedVersion) {
      setMessage({
        type: 'error',
        text: !baseGameFolder
          ? 'Базовая папка не выбрана. Удаление невозможно.'
          : 'Пожалуйста, выберите версию игры для удаления.',
      });

      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: 'Начинаем удаление локализации...' });

    try {
      await invoke('remove_localization', {
        base_folder_path: baseGameFolder,
        selectedLanguageCode: selectedLanguageCode,
        selected_version: selectedVersion,
      });

      await saveSettings({
        base_folder_path: baseGameFolder,
        selected_language_code: undefined,
        selected_version: selectedVersion,
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

      {message && <div>{message.text}</div>}

      {baseGameFolder && (
        <div>
          <span>Базовая папка игры:</span> {baseGameFolder}
        </div>
      )}

      {availableVersions.length > 0 && (
        <div>
          <label htmlFor="version-select">Выберите версию игры:</label>
          <select
            id="version-select"
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            disabled={loading}
          >
            {availableVersions.map((ver) => (
              <option key={ver} value={ver}>
                {ver}
              </option>
            ))}
          </select>
        </div>
      )}

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

      <div>
        <button onClick={handleSelectFolder} disabled={loading}>
          {baseGameFolder
            ? 'Выбрать другую базовую папку'
            : 'Выбрать базовую папку вручную'}
        </button>
        <button
          onClick={handleInstall}
          disabled={!baseGameFolder || !selectedVersion || loading}
        >
          {loading ? 'Установка...' : 'Установить Локализацию'}
        </button>
        <button
          onClick={handleRemove}
          disabled={!baseGameFolder || !selectedVersion || loading}
        >
          Удалить Локализацию
        </button>
      </div>
    </div>
  );
};

export default App;
