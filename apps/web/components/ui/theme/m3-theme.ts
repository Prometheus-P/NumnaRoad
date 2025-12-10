'use client';

import { createTheme, ThemeOptions } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

/**
 * Material Design 3 Theme Configuration
 * Brand Primary Color: Indigo #6366F1
 * Per spec.md clarifications: Korean primary, English secondary
 */

// M3 Color Tokens
const indigo = {
  light: '#6366F1',
  dark: '#818CF8',
};

const secondary = {
  light: '#EC4899',
  dark: '#F472B6',
};

const error = {
  light: '#EF4444',
  dark: '#F87171',
};

const warning = {
  light: '#F59E0B',
  dark: '#FBBF24',
};

const success = {
  light: '#10B981',
  dark: '#34D399',
};

// Surface colors for M3
const surface = {
  light: {
    default: '#FFFFFF',
    variant: '#F5F5F5',
    container: '#FAFAFA',
    containerLow: '#F0F0F0',
    containerHigh: '#EBEBEB',
  },
  dark: {
    default: '#121212',
    variant: '#1E1E1E',
    container: '#252525',
    containerLow: '#1A1A1A',
    containerHigh: '#2D2D2D',
  },
};

// Export color values for testing
export const themeColors = {
  primary: {
    light: indigo.light,
    dark: indigo.dark,
  },
  secondary: {
    light: secondary.light,
    dark: secondary.dark,
  },
  error: {
    light: error.light,
    dark: error.dark,
  },
  warning: {
    light: warning.light,
    dark: warning.dark,
  },
  success: {
    light: success.light,
    dark: success.dark,
  },
};

/**
 * Function to generate the M3 Theme for a given mode (light or dark)
 */
export const getM3Theme = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Palette for light mode
          primary: {
            main: indigo.light,
            contrastText: '#FFFFFF',
          },
          secondary: {
            main: secondary.light,
            contrastText: '#FFFFFF',
          },
          error: {
            main: error.light,
            contrastText: '#FFFFFF',
          },
          warning: {
            main: warning.light,
            contrastText: '#000000',
          },
          success: {
            main: success.light,
            contrastText: '#FFFFFF',
          },
          background: {
            default: surface.light.default,
            paper: surface.light.container,
          },
          text: {
            primary: 'rgba(0, 0, 0, 0.87)',
            secondary: 'rgba(0, 0, 0, 0.6)',
            disabled: 'rgba(0, 0, 0, 0.38)',
          },
        }
      : {
          // Palette for dark mode
          primary: {
            main: indigo.dark,
            contrastText: '#000000',
          },
          secondary: {
            main: secondary.dark,
            contrastText: '#000000',
          },
          error: {
            main: error.dark,
            contrastText: '#000000',
          },
          warning: {
            main: warning.dark,
            contrastText: '#000000',
          },
          success: {
            main: success.dark,
            contrastText: '#000000',
          },
          background: {
            default: surface.dark.default,
            paper: surface.dark.container,
          },
          text: {
            primary: 'rgba(255, 255, 255, 0.87)',
            secondary: 'rgba(255, 255, 255, 0.6)',
            disabled: 'rgba(255, 255, 255, 0.38)',
          },
        }),
  },
  typography: {
    fontFamily: '"Pretendard", "Roboto", "Helvetica", "Arial", sans-serif',
    // M3 Typography Scale
    h1: {
      fontSize: '57px',
      lineHeight: '64px',
      fontWeight: 400,
      letterSpacing: '-0.25px',
    },
    h2: {
      fontSize: '45px',
      lineHeight: '52px',
      fontWeight: 400,
      letterSpacing: '0px',
    },
    h3: {
      fontSize: '36px',
      lineHeight: '44px',
      fontWeight: 400,
      letterSpacing: '0px',
    },
    h4: {
      fontSize: '32px',
      lineHeight: '40px',
      fontWeight: 400,
      letterSpacing: '0px',
    },
    h5: {
      fontSize: '28px',
      lineHeight: '36px',
      fontWeight: 400,
      letterSpacing: '0px',
    },
    h6: {
      fontSize: '24px',
      lineHeight: '32px',
      fontWeight: 400,
      letterSpacing: '0px',
    },
    subtitle1: {
      fontSize: '22px',
      lineHeight: '28px',
      fontWeight: 500,
      letterSpacing: '0px',
    },
    subtitle2: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 500,
      letterSpacing: '0.15px',
    },
    body1: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 400,
      letterSpacing: '0.5px',
    },
    body2: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 400,
      letterSpacing: '0.25px',
    },
    button: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 500,
      letterSpacing: '0.1px',
      textTransform: 'none',
    },
    caption: {
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: 400,
      letterSpacing: '0.4px',
    },
    overline: {
      fontSize: '11px',
      lineHeight: '16px',
      fontWeight: 500,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 12, // M3 default corner radius
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '20px', // M3 full pill shape for buttons
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '28px', // M3 dialog corner radius
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          height: '4px',
        },
      },
    },
  },
});
