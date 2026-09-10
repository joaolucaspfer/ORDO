import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getSetting, setSetting } from './db/settings';

export const darkPalette = {
  bg: '#0B1A10',
  card: '#132419',
  cardAlt: '#1B3022',
  border: '#253D2B',
  text: '#E8F5EC',
  subtext: '#8CA894',
  primary: '#4ADE68',
  primaryDark: '#2D8A43',
  primarySoft: '#1E3A28',
  onPrimary: '#0C1A10',
  danger: '#E4695B',
  dangerSoft: 'rgba(228,105,91,0.15)',
  dangerBorder: 'rgba(228,105,91,0.45)',
  warn: '#E7B84B',
  white: '#FFFFFF',
} as const;

export const lightPalette = {
  bg: '#F0F6EF',
  card: '#FFFFFF',
  cardAlt: '#E5F0E3',
  border: '#C8D9C5',
  text: '#14201A',
  subtext: '#5A7060',
  primary: '#2D8A43',
  primaryDark: '#1E6B32',
  primarySoft: '#D4EDCF',
  onPrimary: '#FFFFFF',
  danger: '#C94A3C',
  dangerSoft: 'rgba(201,74,60,0.12)',
  dangerBorder: 'rgba(201,74,60,0.45)',
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
  onPrimary: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
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