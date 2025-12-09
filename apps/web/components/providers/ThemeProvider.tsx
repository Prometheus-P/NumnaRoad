
'use client';

import * as React from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createContext, useMemo, useState } from 'react';

import { getMuiTheme } from '../ui/theme/m3-theme'; // Import the getMuiTheme function

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
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

  const theme = useMemo(() => createTheme(getMuiTheme(mode)), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline enableColorScheme /> {/* enableColorScheme is useful for CssVarsProvider, but we are using createTheme here */}
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
}
