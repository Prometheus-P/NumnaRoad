/**
 * OrderProgress Component
 *
 * M3 LinearProgress component showing order fulfillment steps.
 * Displays a visual progress bar with step indicators.
 *
 * Task: T086
 */

'use client';

import React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ErrorIcon from '@mui/icons-material/Error';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * Order status types
 */
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Progress step definition
 */
interface ProgressStep {
  key: string;
  label: string;
}

/**
 * Component props
 */
export interface OrderProgressProps {
  /** Current order status */
  status: OrderStatus;
  /** Localized step labels (optional) */
  stepLabels?: {
    paymentReceived?: string;
    processing?: string;
    emailSent?: string;
    ready?: string;
  };
  /** Whether to show step labels */
  showLabels?: boolean;
  /** Compact mode for mobile */
  compact?: boolean;
}

/**
 * Default step configuration
 */
const DEFAULT_STEPS: ProgressStep[] = [
  { key: 'paymentReceived', label: 'Payment Received' },
  { key: 'processing', label: 'Processing' },
  { key: 'emailSent', label: 'Email Sent' },
  { key: 'ready', label: 'Ready to Use' },
];

/**
 * Get progress percentage based on status
 */
export function getStatusProgress(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 25;
    case 'processing':
      return 50;
    case 'completed':
      return 100;
    case 'failed':
      return 0;
    default:
      return 0;
  }
}

/**
 * Get active step index based on status
 */
export function getActiveStep(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'processing':
      return 1;
    case 'completed':
      return 4; // All steps completed
    case 'failed':
      return -1; // Error state
    default:
      return 0;
  }
}

/**
 * Custom step icon component
 */
function StepIcon({
  active,
  completed,
  error,
}: {
  active: boolean;
  completed: boolean;
  error: boolean;
}) {
  const theme = useTheme();

  if (error) {
    return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
  }
  if (completed) {
    return <CheckCircleIcon sx={{ color: theme.palette.success.main }} />;
  }
  if (active) {
    return (
      <RadioButtonUncheckedIcon sx={{ color: theme.palette.primary.main }} />
    );
  }
  return (
    <RadioButtonUncheckedIcon
      sx={{ color: alpha(theme.palette.text.primary, 0.3) }}
    />
  );
}

/**
 * OrderProgress Component
 *
 * Shows order fulfillment progress with a linear progress bar
 * and optional step indicators.
 */
export function OrderProgress({
  status,
  stepLabels,
  showLabels = true,
  compact = false,
}: OrderProgressProps) {
  const theme = useTheme();
  const progress = getStatusProgress(status);
  const activeStep = getActiveStep(status);
  const isFailed = status === 'failed';

  // Merge custom labels with defaults
  const steps = DEFAULT_STEPS.map((step) => ({
    ...step,
    label: stepLabels?.[step.key as keyof typeof stepLabels] ?? step.label,
  }));

  // Determine progress bar color
  const progressColor = isFailed ? 'error' : 'primary';

  if (compact) {
    // Compact mode: just the progress bar with percentage
    return (
      <Box
        sx={{ width: '100%' }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Order progress: ${progress}%`}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ flexGrow: 1, mr: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              color={progressColor}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              }}
            />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minWidth: 40 }}
          >
            {progress}%
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }} data-testid="order-progress">
      {/* Progress bar */}
      <Box sx={{ mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          color={progressColor}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
          }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Order progress: ${progress}%`}
        />
      </Box>

      {/* Step indicators */}
      {showLabels && (
        <Stepper
          activeStep={isFailed ? -1 : activeStep}
          alternativeLabel
          sx={{
            '& .MuiStepLabel-label': {
              fontSize: '0.75rem',
              mt: 0.5,
            },
          }}
        >
          {steps.map((step, index) => {
            const isStepCompleted = status === 'completed' || index < activeStep;
            const isStepActive = index === activeStep && !isFailed;
            const isStepError = isFailed && index === 0;

            return (
              <Step key={step.key} completed={isStepCompleted}>
                <StepLabel
                  StepIconComponent={() => (
                    <StepIcon
                      active={isStepActive}
                      completed={isStepCompleted}
                      error={isStepError}
                    />
                  )}
                  error={isStepError}
                >
                  {step.label}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>
      )}
    </Box>
  );
}

export default OrderProgress;
