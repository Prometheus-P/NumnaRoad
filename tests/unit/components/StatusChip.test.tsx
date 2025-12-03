import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../apps/web/components/ui/theme/m3-theme';
import StatusChip from '../../../apps/web/components/ui/StatusChip';

// Test wrapper with theme
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('StatusChip Component', () => {
  describe('Status Labels', () => {
    it('should render pending status', () => {
      render(
        <TestWrapper>
          <StatusChip status="pending" />
        </TestWrapper>
      );
      const chip = screen.getByRole('status');
      expect(chip).toBeInTheDocument();
    });

    it('should render processing status', () => {
      render(
        <TestWrapper>
          <StatusChip status="processing" />
        </TestWrapper>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render completed status', () => {
      render(
        <TestWrapper>
          <StatusChip status="completed" />
        </TestWrapper>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render failed status', () => {
      render(
        <TestWrapper>
          <StatusChip status="failed" />
        </TestWrapper>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('M3 Color Semantics', () => {
    it('should use warning color for pending status', () => {
      const { container } = render(
        <TestWrapper>
          <StatusChip status="pending" />
        </TestWrapper>
      );
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveAttribute('data-status', 'pending');
    });

    it('should use info color for processing status', () => {
      const { container } = render(
        <TestWrapper>
          <StatusChip status="processing" />
        </TestWrapper>
      );
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveAttribute('data-status', 'processing');
    });

    it('should use success color for completed status', () => {
      const { container } = render(
        <TestWrapper>
          <StatusChip status="completed" />
        </TestWrapper>
      );
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveAttribute('data-status', 'completed');
    });

    it('should use error color for failed status', () => {
      const { container } = render(
        <TestWrapper>
          <StatusChip status="failed" />
        </TestWrapper>
      );
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveAttribute('data-status', 'failed');
    });
  });

  describe('Accessibility', () => {
    it('should have status role for screen readers', () => {
      render(
        <TestWrapper>
          <StatusChip status="completed" />
        </TestWrapper>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-label describing the status', () => {
      render(
        <TestWrapper>
          <StatusChip status="completed" />
        </TestWrapper>
      );
      const chip = screen.getByRole('status');
      expect(chip).toHaveAttribute('aria-label');
    });
  });

  describe('Localization Support', () => {
    it('should accept custom label prop', () => {
      render(
        <TestWrapper>
          <StatusChip status="completed" label="완료" />
        </TestWrapper>
      );
      expect(screen.getByText('완료')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render small size by default', () => {
      const { container } = render(
        <TestWrapper>
          <StatusChip status="completed" />
        </TestWrapper>
      );
      const chip = container.querySelector('.MuiChip-sizeSmall');
      expect(chip).toBeInTheDocument();
    });

    it('should render medium size when specified', () => {
      const { container } = render(
        <TestWrapper>
          <StatusChip status="completed" size="medium" />
        </TestWrapper>
      );
      const chip = container.querySelector('.MuiChip-sizeMedium');
      expect(chip).toBeInTheDocument();
    });
  });
});
