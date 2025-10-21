import React from 'react';
import { useTranslation } from 'react-i18next';

interface FolderDisplayProps {
  folder: string | null;
}

export const FolderDisplay: React.FC<FolderDisplayProps> = ({ folder }) => {
  const { t } = useTranslation();

  if (!folder) return null;

  return (
    <div>
      <span>{t('folder_label')}</span> {folder}
    </div>
  );
};
