import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '../types';

export const readSettings = async (): Promise<AppSettings> => {
  try {
    const settingsJson = await invoke<string>('read_settings');
    return JSON.parse(settingsJson);
  } catch (error) {
    console.error('Error reading settings:', error);
    return {};
  }
};

export const writeSettings = async (settings: AppSettings): Promise<void> => {
  try {
    const settingsJson = JSON.stringify(settings);
    await invoke('write_settings', { settingsJson });
  } catch (error) {
    console.error('Error writing settings:', error);
  }
};

export const tryAutoFindBaseFolder = async (): Promise<string | null> => {
  try {
    return await invoke<string | null>('try_auto_find_base_folder');
  } catch (error) {
    console.error('Error finding base folder:', error);
    return null;
  }
};

export const findAvailableVersions = async (
  baseFolderPath: string
): Promise<string[]> => {
  try {
    return await invoke<string[]>('find_available_versions', {
      baseFolderPath,
    });
  } catch (error) {
    console.error('Error finding versions:', error);
    return [];
  }
};

export const setLanguageConfig = async (
  baseFolderPath: string,
  selectedLanguageCode: string,
  selectedVersion: string
): Promise<string> => {
  try {
    return await invoke<string>('set_language_config', {
      baseFolderPath,
      selectedLanguageCode,
      selectedVersion,
    });
  } catch (error) {
    console.error('Error setting language config:', error);
    throw error;
  }
};

export const writeTextFile = async (
  path: string,
  content: string
): Promise<void> => {
  try {
    await invoke('write_text_file', { path, content });
  } catch (error) {
    console.error('Error writing text file:', error);
    throw error;
  }
};

export const removeLocalization = async (
  baseFolderPath: string,
  selectedLanguageCode: string,
  selectedVersion: string
): Promise<void> => {
  try {
    await invoke('remove_localization', {
      baseFolderPath,
      selectedLanguageCode,
      selectedVersion,
    });
  } catch (error) {
    console.error('Error removing localization:', error);
    throw error;
  }
};
