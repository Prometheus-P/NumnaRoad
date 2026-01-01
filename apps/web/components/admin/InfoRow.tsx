'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface InfoRowProps {
  /** Label displayed on the left side */
  label: string;
  /** Value displayed on the right side */
  value?: string | number | null;
  /** Whether to show a copy button */
  copyable?: boolean;
  /** Custom component to render instead of text value */
  children?: React.ReactNode;
}

/**
 * InfoRow displays a label-value pair in a horizontal layout.
 *
 * Used in detail pages (orders, products) for displaying structured data.
 * Supports optional copy functionality for values like IDs and codes.
 */
export const InfoRow = memo(function InfoRow({
  label,
  value,
  copyable = false,
  children,
}: InfoRowProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(() => {
    if (value != null) {
      navigator.clipboard.writeText(String(value));
      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  const displayValue = children ?? (value != null ? String(value) : '-');

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      py={1}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box display="flex" alignItems="center" gap={1}>
        {typeof displayValue === 'string' ? (
          <Typography variant="body2" fontWeight={500}>
            {displayValue}
          </Typography>
        ) : (
          displayValue
        )}
        {copyable && value != null && (
          <Button
            size="small"
            onClick={handleCopy}
            sx={{ minWidth: 'auto', p: 0.5 }}
            aria-label={copied ? 'Copied' : 'Copy to clipboard'}
          >
            {copied ? (
              <CheckCircleIcon fontSize="small" color="success" />
            ) : (
              <ContentCopyIcon fontSize="small" />
            )}
          </Button>
        )}
      </Box>
    </Box>
  );
});
