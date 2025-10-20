import React from 'react';
import { useTranslation } from 'react-i18next';

interface VersionSelectorProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const VersionSelector: React.FC<VersionSelectorProps> = ({
  options,
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  if (options.length === 0) return null;

  return (
    <div>
      <label htmlFor="version-select">{t('select_version')}</label>
      <select
        id="version-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((ver) => (
          <option key={ver} value={ver}>
            {ver}
          </option>
        ))}
      </select>
    </div>
  );
};
