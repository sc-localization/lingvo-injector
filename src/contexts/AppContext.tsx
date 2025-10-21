import { createContext, useContext, useState, ReactNode } from 'react';
import type { Message } from '../types';

interface AppContextType {
  baseGameFolder: string | null;
  setBaseGameFolder: (folder: string | null) => void;
  availableVersions: string[];
  setAvailableVersions: (versions: string[]) => void;
  selectedVersion: string;
  setSelectedVersion: (version: string) => void;
  selectedGameLanguageCode: string;
  setSelectedGameLanguageCode: (code: string) => void;
  selectedAppLanguage: string;
  setSelectedAppLanguage: (language: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  message: Message | null;
  setMessage: (message: Message | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [baseGameFolder, setBaseGameFolder] = useState<string | null>(null);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [selectedGameLanguageCode, setSelectedGameLanguageCode] =
    useState<string>('korean_(south_korea)');
  const [selectedAppLanguage, setSelectedAppLanguage] = useState<string>('en');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  return (
    <AppContext.Provider
      value={{
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }

  return context;
};
