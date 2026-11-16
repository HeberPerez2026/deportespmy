import React, { createContext, useContext, useEffect, useState } from 'react';

export type ColorPaletteId = 'volt' | 'esmeralda' | 'azul' | 'ambar' | 'carmesi';

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
    description: 'Estadio Nocturno clásico lima floodlight',
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    swatchPrimary: '#10B981',
    swatchSecondary: '#22D3EE',
    description: 'Verde césped nocturno y cian',
  },
  {
    id: 'azul',
    name: 'Azul Golfo',
    swatchPrimary: '#38BDF8',
    swatchSecondary: '#60A5FA',
    description: 'Azul reflector atlántico',
  },
  {
    id: 'ambar',
    name: 'Ámbar Copa',
    swatchPrimary: '#F59E0B',
    swatchSecondary: '#FB923C',
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

const STORAGE_KEY = 'dpmy_estadio_palette_v2';

interface ThemeContextType {
  palette: ColorPaletteId;
  setPalette: (next: ColorPaletteId) => void;
  activePalette: PaletteOption;
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
      const saved = localStorage.getItem(STORAGE_KEY) as ColorPaletteId | null;
      if (saved && VALID_PALETTES.has(saved)) {
        return saved;
      }
    } catch {}
    return 'volt';
  });

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-palette', palette);
    document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.setItem(STORAGE_KEY, palette);
    } catch {}
  }, [palette]);

  const setPalette = (next: ColorPaletteId) => {
    if (VALID_PALETTES.has(next)) {
      setPaletteState(next);
    }
  };

  const activePalette =
    COLOR_PALETTES.find((p) => p.id === palette) || COLOR_PALETTES[0];

  return (
    <ThemeContext.Provider value={{ palette, setPalette, activePalette }}>
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
