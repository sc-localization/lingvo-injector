export interface AppSettings {
  base_folder_path?: string | null;
  selected_language_code?: string;
  selected_version?: string;
  app_language?: string;
}

export interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface LanguageOption {
  name: string;
  code: string;
  isRecommended?: boolean;
}
