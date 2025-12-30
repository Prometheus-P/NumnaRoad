import { createTheme, ThemeOptions } from '@mui/material/styles';
import { PaletteMode } from '@mui/material'; // Import PaletteMode for typing

// Brand primary color from clarifications
const primaryColor = '#6366F1'; // Indigo

const typographyConfig = {
  fontFamily: '"NanumSquare", "Pretendard", "Roboto", sans-serif',
  h1: { fontSize: '57px', lineHeight: '64px', fontWeight: 400 }, // displayLarge
  h2: { fontSize: '45px', lineHeight: '52px', fontWeight: 400 }, // displayMedium
  h3: { fontSize: '36px', lineHeight: '44px', fontWeight: 400 }, // displaySmall
  h4: { fontSize: '32px', lineHeight: '40px', fontWeight: 400 }, // headlineLarge
  h5: { fontSize: '28px', lineHeight: '36px', fontWeight: 400 }, // headlineMedium
  h6: { fontSize: '24px', lineHeight: '32px', fontWeight: 400 }, // headlineSmall
  subtitle1: { fontSize: '16px', lineHeight: '24px', fontWeight: 500 }, // titleMedium
  subtitle2: { fontSize: '14px', lineHeight: '20px', fontWeight: 500 }, // titleSmall
  body1: { fontSize: '16px', lineHeight: '24px', fontWeight: 400 }, // bodyLarge
  body2: { fontSize: '14px', lineHeight: '20px', fontWeight: 400 }, // bodyMedium
  button: {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '14px', lineHeight: '20px', // labelLarge
  },
  caption: { fontSize: '12px', lineHeight: '16px', fontWeight: 400 }, // bodySmall
  overline: { fontSize: '11px', lineHeight: '16px', fontWeight: 500 }, // labelSmall
  // Custom M3 typography variants - can be mapped to existing MUI variants or used directly
  titleLarge: { fontSize: '22px', lineHeight: '28px', fontWeight: 500 },
  titleMedium: { fontSize: '16px', lineHeight: '24px', fontWeight: 500 },
  titleSmall: { fontSize: '14px', lineHeight: '20px', fontWeight: 500 },
  bodyLarge: { fontSize: '16px', lineHeight: '24px', fontWeight: 400 },
  bodyMedium: { fontSize: '14px', lineHeight: '20px', fontWeight: 400 },
  bodySmall: { fontSize: '12px', lineHeight: '16px', fontWeight: 400 },
  labelLarge: { fontSize: '14px', lineHeight: '20px', fontWeight: 500 },
  labelMedium: { fontSize: '12px', lineHeight: '16px', fontWeight: 500 },
  labelSmall: { fontSize: '11px', lineHeight: '16px', fontWeight: 500 },
};

const componentsConfig = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '20px',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: '28px',
      },
    },
  },
};

const shapeConfig = {
  borderRadius: 12,
};

const lightPalette = {
  primary: {
    main: primaryColor,
    light: '#818CF8', // Lighter Indigo
    dark: '#4F46E5',  // Darker Indigo
  },
  secondary: {
    main: '#EC4899', // Pink
    light: '#F879B9',
    dark: '#DB2777',
  },
  error: {
    main: '#EF4444', // Red
    light: '#F87171',
    dark: '#DC2626',
  },
  warning: {
    main: '#F59E0B', // Amber
    light: '#FBBF24',
    dark: '#D97706',
  },
  success: {
    main: '#10B981', // Green
    light: '#34D399',
    dark: '#059669',
  },
  background: {
    default: '#F5F7FA', // Light background
    paper: '#FFFFFF',
  },
  text: {
    primary: '#1F2937', // Dark gray
    secondary: '#4B5563', // Medium gray
  },
};

const darkPalette = {
  primary: {
    main: primaryColor,
    light: '#818CF8', // Lighter Indigo
    dark: '#4F46E5',  // Darker Indigo
  },
  secondary: {
    main: '#F472B6', // Lighter Pink
    light: '#F9A8D4',
    dark: '#C02678',
  },
  error: {
    main: '#F87171', // Lighter Red
    light: '#FCA5A5',
    dark: '#B91C1C',
  },
  warning: {
    main: '#FBBF24', // Lighter Amber
    light: '#FCD34D',
    dark: '#B45309',
  },
  success: {
    main: '#34D399', // Lighter Green
    light: '#6EE7B7',
    dark: '#047857',
  },
  background: {
    default: '#121212', // Dark background
    paper: '#1E1E1E',
  },
  text: {
    primary: '#F9FAFB', // Light gray
    secondary: '#E5E7EB', // Lighter gray
  },
};

export const getMuiTheme = (mode: PaletteMode): ThemeOptions => {
  const palette = mode === 'light' ? lightPalette : darkPalette;

  return {
    palette: {
      mode,
      ...palette,
    },
    typography: typographyConfig,
    shape: shapeConfig,
    components: componentsConfig,
  };
};

export const theme = {
  light: createTheme(getMuiTheme('light')),
  dark: createTheme(getMuiTheme('dark')),
};

export const themeColors = {
  primary: {
    light: theme.light.palette.primary.main,
    dark: theme.dark.palette.primary.main,
  },
  secondary: {
    light: lightPalette.secondary.main,
    dark: darkPalette.secondary.main,
  },
  error: {
    light: lightPalette.error.main,
    dark: darkPalette.error.main,
  },
  warning: {
    light: lightPalette.warning.main,
    dark: darkPalette.warning.main,
  },
  success: {
    light: lightPalette.success.main,
    dark: darkPalette.success.main,
  },
};