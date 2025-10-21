import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './components/LanguageSelector';
import { VersionSelector } from './components/VersionSelector';
import { FolderDisplay } from './components/FolderDisplay';
import { MessageDisplay } from './components/MessageDisplay';
import { ActionButtons } from './components/ActionButtons';
import { useAppContext } from './contexts/AppContext';
import {
  readSettings,
  tryAutoFindBaseFolder,
  findAvailableVersions,
  writeSettings,
} from './services/tauriService';
import type { LanguageOption } from './types';

const appLanguages: LanguageOption[] = [
  { name: 'English', code: 'en' },
  { name: 'Русский', code: 'ru' },
];

const gameLanguages: LanguageOption[] = [
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

export default function App() {
  const { t, i18n } = useTranslation();
  const {
    baseGameFolder,
    setBaseGameFolder,
    availableVersions,
    setAvailableVersions,
    selectedVersion,
    setSelectedVersion,
    selectedGameLanguageCode,
    setSelectedGameLanguageCode,
    selectedAppLanguage,
    setSelectedAppLanguage,
    loading,
    setLoading,
    message,
    setMessage,
  } = useAppContext();

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      setMessage({ type: 'info', text: t('loading_settings') });

      try {
        const settings = await readSettings();
        const foundPath =
          settings.base_folder_path || (await tryAutoFindBaseFolder());

        if (foundPath) {
          setBaseGameFolder(foundPath);
          const versions = await findAvailableVersions(foundPath);
          setAvailableVersions(versions);
          setSelectedVersion(settings.selected_version || (versions[0] ?? ''));
        }

        setSelectedGameLanguageCode(
          settings.selected_language_code || gameLanguages[0].code
        );
        const appLang = settings.app_language || 'en';
        setSelectedAppLanguage(appLang);

        setMessage(
          foundPath
            ? {
                type: 'success',
                text: t('folder_found', { folder: foundPath }),
              }
            : { type: 'info', text: t('folder_not_found') }
        );
      } catch (error) {
        setMessage({ type: 'error', text: t('install_error', { error }) });
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [
    setAvailableVersions,
    setBaseGameFolder,
    setLoading,
    setMessage,
    setSelectedAppLanguage,
    setSelectedGameLanguageCode,
    setSelectedVersion,
    t,
  ]);

  useEffect(() => {
    const saveSettings = async () => {
      try {
        await writeSettings({
          base_folder_path: baseGameFolder,
          selected_language_code: selectedGameLanguageCode,
          selected_version: selectedVersion,
          app_language: selectedAppLanguage,
        });
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    };

    if (
      baseGameFolder ||
      selectedGameLanguageCode ||
      selectedVersion ||
      selectedAppLanguage
    ) {
      saveSettings();
    }
  }, [
    baseGameFolder,
    selectedAppLanguage,
    selectedGameLanguageCode,
    selectedVersion,
  ]);

  useEffect(() => {
    i18n.changeLanguage(selectedAppLanguage);
  }, [selectedAppLanguage, i18n]);

  return (
    <div>
      <header>
        <h1>{t('title')}</h1>
      </header>

      <MessageDisplay message={message} />

      <FolderDisplay folder={baseGameFolder} />

      <LanguageSelector
        options={appLanguages}
        value={selectedAppLanguage}
        onChange={setSelectedAppLanguage}
        labelKey="select_app_language"
        disabled={loading}
      />

      <VersionSelector
        options={availableVersions}
        value={selectedVersion}
        onChange={setSelectedVersion}
        disabled={loading}
      />

      <LanguageSelector
        options={gameLanguages}
        value={selectedGameLanguageCode}
        onChange={setSelectedGameLanguageCode}
        labelKey="select_language"
        disabled={loading}
        isGameLanguage
      />

      {selectedGameLanguageCode === 'korean_(south_korea)' && (
        <p>{t('russian_note')}</p>
      )}

      <ActionButtons />
    </div>
  );
}
