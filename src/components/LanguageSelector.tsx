import React from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageOption } from '../types';

interface LanguageSelectorProps {
  options: LanguageOption[];
  value: string;
  onChange: (value: string) => void;
  labelKey: string;
  disabled?: boolean;
  isGameLanguage?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  options,
  value,
  onChange,
  labelKey,
  disabled = false,
  isGameLanguage = false,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <label htmlFor={`${isGameLanguage ? 'game' : 'app'}-language-select`}>
        {t(labelKey)}
      </label>

      <select
        id={`${isGameLanguage ? 'game' : 'app'}-language-select`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((lang, idx) => (
          <option key={lang.code + idx} value={lang.code}>
            {lang.name} {lang.isRecommended ? `(${t('recommended')})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
