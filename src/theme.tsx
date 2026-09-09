import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getSetting, setSetting } from './db/settings';

export const darkPalette = {
  bg: '#0F1E14',
  card: '#16291C',
  cardAlt: '#1E3723',
  border: '#2A452F',
  text: '#EAF4EC',
  subtext: '#8FA795',
  primary: '#55D66B',
  primaryDark: '#2F8F47',
  primarySoft: '#2A4632',
  danger: '#E4695B',
  warn: '#E7B84B',
  white: '#FFFFFF',
} as const;

export const lightPalette = {
  bg: '#F3F7F2',
  card: '#FFFFFF',
  cardAlt: '#E9F0E7',
  border: '#CFDCCB',
  text: '#16221A',
  subtext: '#5E7264',
  primary: '#2F8F47',
  primaryDark: '#1E6B32',
  primarySoft: '#D9F0DC',
  danger: '#C94A3C',
  warn: '#B8810F',
  white: '#FFFFFF',
} as const;

export interface Theme {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  subtext: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  danger: string;
  warn: string;
  white: string;
}

export type ThemeState = {
  theme: Theme;
  isDark: boolean;
  setDark: (dark: boolean) => void;
};

const defaultState: ThemeState = {
  theme: darkPalette,
  isDark: true,
  setDark: () => {},
};

const ThemeContext = createContext<ThemeState>(defaultState);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    getSetting(db, 'theme').then((value) => setIsDark(value !== 'light'));
  }, [db]);

  const setDark = (dark: boolean) => {
    setIsDark(dark);
    setSetting(db, 'theme', dark ? 'dark' : 'light');
  };

  const theme: Theme = isDark ? darkPalette : lightPalette;

  return (
    <ThemeContext.Provider value={{ theme, isDark, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}

/**
 * Paleta predefinida (escura) para componentes estáticos que não seguem o tema
 * (ex.: onboarding e a sombra da criatura).
 */
export const theme = darkPalette;