import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../apps/web/components/ui/theme/m3-theme';
import OrderCard from '../../../apps/web/components/ui/OrderCard';

// Test wrapper with theme
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('OrderCard Component', () => {
  const mockOrder = {
    id: 'test-order-123',
    productName: 'Bolivia 5GB 7 Days',
    country: 'BO',
    dataLimit: '5GB',
    durationDays: 7,
    status: 'completed' as const,
    createdAt: new Date('2025-12-02T10:00:00Z'),
    completedAt: new Date('2025-12-02T10:00:05Z'),
    qrCodeUrl: 'https://example.com/qr/test123.png',
    iccid: '8901234567890123456',
    activationCode: 'LPA:1$abc.com$XXXXX',
  };

  it('should render order ID', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );
    expect(screen.getByText(/test-order-123/i)).toBeInTheDocument();
  });

  it('should render product name', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );
    expect(screen.getByText('Bolivia 5GB 7 Days')).toBeInTheDocument();
  });

  it('should render data limit', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );
    expect(screen.getByText('5GB')).toBeInTheDocument();
  });

  it('should render duration', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it('should render status chip', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );
    // Status should be displayed (completed)
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show QR code when order is completed', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );
    expect(screen.getByRole('img', { name: /qr code/i })).toBeInTheDocument();
  });

  it('should not show QR code when order is pending', () => {
    const pendingOrder = { ...mockOrder, status: 'pending' as const, qrCodeUrl: undefined };
    render(
      <TestWrapper>
        <OrderCard order={pendingOrder} />
      </TestWrapper>
    );
    expect(screen.queryByRole('img', { name: /qr code/i })).not.toBeInTheDocument();
  });

  it('should display activation code for completed orders', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );
    expect(screen.getByText(/LPA:1/)).toBeInTheDocument();
  });

  it('should have proper M3 Card styling', () => {
    const { container } = render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );
    const card = container.querySelector('.MuiCard-root');
    expect(card).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );
    // Check for article role (semantic for card content)
    expect(screen.getByRole('article')).toBeInTheDocument();
  });
});
