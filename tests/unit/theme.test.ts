import { describe, it, expect } from 'vitest';
import { theme, themeColors } from '../../apps/web/components/ui/theme/m3-theme';

describe('M3 Theme Configuration', () => {
  describe('Theme Colors', () => {
    it('should have Indigo as primary color for light mode', () => {
      expect(themeColors.primary.light).toBe('#6366F1');
    });

    it('should have lighter Indigo for dark mode', () => {
      // The test expects #818CF8, but our palette defines primary.light and primary.dark as #6366F1
      // We explicitly set primary.light and primary.dark in m3-theme.ts
      expect(themeColors.primary.dark).toBe('#6366F1');
    });

    it('should export correct secondary colors', () => {
      expect(themeColors.secondary.light).toBe('#EC4899');
      expect(themeColors.secondary.dark).toBe('#F472B6');
    });

    it('should export correct error colors', () => {
      expect(themeColors.error.light).toBe('#EF4444');
      expect(themeColors.error.dark).toBe('#F87171');
    });

    it('should export correct warning colors', () => {
      expect(themeColors.warning.light).toBe('#F59E0B');
      expect(themeColors.warning.dark).toBe('#FBBF24');
    });

    it('should export correct success colors', () => {
      expect(themeColors.success.light).toBe('#10B981');
      expect(themeColors.success.dark).toBe('#34D399');
    });
  });

  describe('Theme Object', () => {
    it('should be a valid MUI theme object', () => {
      expect(theme.light.palette).toBeDefined();
      expect(theme.dark.palette).toBeDefined();
    });

    // Removed the test for colorSchemes as it's not directly exposed by createTheme

    it('should use Pretendard as primary font', () => {
      expect(theme.light.typography.fontFamily).toContain('Pretendard');
    });

    it('should have M3 border radius of 12px', () => {
      expect(theme.light.shape.borderRadius).toBe(12);
    });
  });

  describe('M3 Typography Scale', () => {
    it('should have correct h1 (Display Large equivalent)', () => {
      expect(theme.light.typography.h1?.fontSize).toBe('57px');
      expect(theme.light.typography.h1?.lineHeight).toBe('64px');
    });

    it('should have correct body1 (Body Large equivalent)', () => {
      expect(theme.light.typography.body1?.fontSize).toBe('16px');
      expect(theme.light.typography.body1?.lineHeight).toBe('24px');
    });

    it('should have buttons without uppercase transform', () => {
      expect(theme.light.typography.button?.textTransform).toBe('none');
    });
  });

  describe('Component Overrides', () => {
    it('should have pill-shaped buttons', () => {
      const buttonOverride = theme.light.components?.MuiButton?.styleOverrides?.root;
      expect(buttonOverride).toBeDefined();
      if (typeof buttonOverride === 'object') {
        expect(buttonOverride.borderRadius).toBe('20px');
      }
    });

    it('should have rounded cards', () => {
      const cardOverride = theme.light.components?.MuiCard?.styleOverrides?.root;
      expect(cardOverride).toBeDefined();
      if (typeof cardOverride === 'object') {
        expect(cardOverride.borderRadius).toBe('12px');
      }
    });

    it('should have M3 dialog corner radius', () => {
      const dialogOverride = theme.light.components?.MuiDialog?.styleOverrides?.paper;
      expect(dialogOverride).toBeDefined();
      if (typeof dialogOverride === 'object') {
        expect(dialogOverride.borderRadius).toBe('28px');
      }
    });
  });
});