import React from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import {
  findAvailableVersions,
  setLanguageConfig,
  writeTextFile,
  removeLocalization,
} from '../services/tauriService';
import { fetchTranslation } from '../api/translationApi';
import { useAppContext } from '../contexts/AppContext';
import { writeSettings } from '../services/tauriService';

export const ActionButtons: React.FC = () => {
  const { t } = useTranslation();
  const {
    baseGameFolder,
    setBaseGameFolder,
    selectedVersion,
    selectedGameLanguageCode,
    loading,
    setLoading,
    setMessage,
    setAvailableVersions,
    setSelectedVersion,
    selectedAppLanguage,
  } = useAppContext();

  const handleSelectFolder = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        directory: true,
        title: t('select_folder'),
      });

      if (selectedPath) {
        setBaseGameFolder(selectedPath);
        setMessage({
          type: 'info',
          text: t('folder_found', { folder: selectedPath }),
        });

        const versions = await findAvailableVersions(selectedPath);

        setAvailableVersions(versions);

        if (versions.length > 0) setSelectedVersion(versions[0]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('select_folder_error', { error }) });
    }
  };

  const handleInstall = async () => {
    if (!baseGameFolder || !selectedVersion) {
      setMessage({
        type: 'error',
        text: !baseGameFolder
          ? t('no_folder_selected')
          : t('no_version_selected'),
      });

      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: t('installing_localization') });

    try {
      const targetLocalizationPath = await setLanguageConfig(
        baseGameFolder,
        selectedGameLanguageCode,
        selectedVersion
      );

      const fileContent = await fetchTranslation(
        selectedVersion,
        'translation.ini'
      );

      const targetFilePath = `${targetLocalizationPath}/global.ini`.replace(
        /\\/g,
        '/'
      );

      await writeTextFile(targetFilePath, fileContent);

      setMessage({ type: 'success', text: t('install_success') });
    } catch (error) {
      setMessage({ type: 'error', text: t('install_error', { error }) });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!baseGameFolder || !selectedVersion) {
      setMessage({
        type: 'error',
        text: !baseGameFolder
          ? t('no_folder_remove')
          : t('no_version_selected'),
      });

      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: t('removing_localization') });

    try {
      await removeLocalization(
        baseGameFolder,
        selectedGameLanguageCode,
        selectedVersion
      );

      await writeSettings({
        base_folder_path: baseGameFolder,
        selected_language_code: undefined,
        selected_version: selectedVersion,
        app_language: selectedAppLanguage,
      });

      setMessage({ type: 'success', text: t('remove_success') });
    } catch (error) {
      setMessage({ type: 'error', text: t('remove_error', { error }) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleSelectFolder} disabled={loading}>
        {baseGameFolder ? t('change_folder') : t('select_folder')}
      </button>

      <button
        onClick={handleInstall}
        disabled={!baseGameFolder || !selectedVersion || loading}
      >
        {loading ? t('installing') : t('install')}
      </button>

      <button
        onClick={handleRemove}
        disabled={!baseGameFolder || !selectedVersion || loading}
      >
        {t('remove')}
      </button>
    </div>
  );
};
