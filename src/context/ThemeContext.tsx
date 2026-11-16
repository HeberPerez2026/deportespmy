import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

export type ColorPaletteId = 'volt' | 'esmeralda' | 'azul' | 'ambar' | 'carmesi';
export type ThemeMode = 'dark' | 'light';

export interface PaletteOption {
  id: ColorPaletteId;
  name: string;
  swatchPrimary: string;
  swatchSecondary: string;
  description: string;
}

export const COLOR_PALETTES: PaletteOption[] = [
  {
    id: 'volt',
    name: 'Lima Estadio',
    swatchPrimary: '#B8F230',
    swatchSecondary: '#38BDF8',
    description: 'Lima floodlight deportivo y azul cielo',
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    swatchPrimary: '#10B981',
    swatchSecondary: '#22D3EE',
    description: 'Verde césped y cian',
  },
  {
    id: 'azul',
    name: 'Azul Golfo',
    swatchPrimary: '#0EA5E9',
    swatchSecondary: '#3B82F6',
    description: 'Azul reflector atlántico',
  },
  {
    id: 'ambar',
    name: 'Ámbar Copa',
    swatchPrimary: '#F59E0B',
    swatchSecondary: '#EA580C',
    description: 'Dorado torneo y reflector cálido',
  },
  {
    id: 'carmesi',
    name: 'Carmesí',
    swatchPrimary: '#F43F5E',
    swatchSecondary: '#FB923C',
    description: 'Rojo estadio y coral intenso',
  },
];

const PALETTE_STORAGE_KEY = 'dpmy_estadio_palette_v2';
const MODE_STORAGE_KEY = 'dpmy_theme_mode_v1';

interface ThemeContextType {
  palette: ColorPaletteId;
  setPalette: (next: ColorPaletteId) => void;
  activePalette: PaletteOption;
  mode: ThemeMode;
  setMode: (next: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const VALID_PALETTES = new Set<ColorPaletteId>([
  'volt',
  'esmeralda',
  'azul',
  'ambar',
  'carmesi',
]);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [palette, setPaletteState] = useState<ColorPaletteId>(() => {
    try {
      const saved = localStorage.getItem(PALETTE_STORAGE_KEY) as ColorPaletteId | null;
      if (saved && VALID_PALETTES.has(saved)) {
        return saved;
      }
    } catch {}
    return 'volt';
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {}
    return 'dark';
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-palette', palette);
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, palette);
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {}
  }, [palette, mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-palette', palette);
  }, [palette, mode]);

  const setPalette = (next: ColorPaletteId) => {
    if (VALID_PALETTES.has(next)) {
      setPaletteState(next);
    }
  };

  const setMode = (next: ThemeMode) => {
    setModeState(next === 'light' ? 'light' : 'dark');
  };

  const toggleMode = () => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const activePalette =
    COLOR_PALETTES.find((p) => p.id === palette) || COLOR_PALETTES[0];

  return (
    <ThemeContext.Provider
      value={{
        palette,
        setPalette,
        activePalette,
        mode,
        setMode,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
