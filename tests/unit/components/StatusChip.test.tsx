/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../../apps/web/components/providers/ThemeProvider'; // Corrected import
import StatusChip from '../../../apps/web/components/ui/StatusChip';

// Test wrapper with custom ThemeProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('StatusChip Component', () => {
  it('should render pending status', () => {
    render(
      <TestWrapper>
        <StatusChip status="pending" />
      </TestWrapper>
    );
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should render processing status', () => {
    render(
      <TestWrapper>
        <StatusChip status="processing" />
      </TestWrapper>
    );
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('should render completed status', () => {
    render(
      <TestWrapper>
        <StatusChip status="completed" />
      </TestWrapper>
    );
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should render failed status', () => {
    render(
      <TestWrapper>
        <StatusChip status="failed" />
      </TestWrapper>
    );
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});