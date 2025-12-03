'use client';

import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '../ui/theme/m3-theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Material Design 3 Theme Provider
 * Wraps the application with MUI theme and CSS baseline reset
 * Supports light/dark mode via CSS class selector
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

export default ThemeProvider;
