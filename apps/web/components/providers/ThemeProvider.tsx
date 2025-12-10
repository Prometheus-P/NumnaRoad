'use client';

import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createContext, useMemo, useState } from 'react';
import { getM3Theme } from '../ui/theme/m3-theme'; // Assuming m3-theme exports a function to get themes

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Create a context for the color mode
export const ColorModeContext = createContext({ toggleColorMode: () => {} });

/**
 * Material Design 3 Theme Provider
 * Wraps the application with MUI theme and CSS baseline reset
 * Supports light/dark mode based on system preference and user toggle
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = useMemo(() => createTheme(getM3Theme(mode)), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline enableColorScheme /> {/* enableColorScheme enables system preference detection */}
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default ThemeProvider;
