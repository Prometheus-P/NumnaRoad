'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface CopyableTextProps {
  /** The text to display and copy */
  text: string;
  /** Label shown on hover for copy action */
  copyLabel?: string;
  /** Label shown after successful copy */
  copiedLabel?: string;
  /** Maximum width before truncating with ellipsis */
  maxWidth?: number | string;
  /** Typography variant */
  variant?: 'body1' | 'body2' | 'caption';
  /** Whether to use monospace font */
  monospace?: boolean;
  /** Additional styles */
  sx?: object;
}

/**
 * CopyableText displays text with a copy button that appears on hover.
 *
 * Used for IDs, order numbers, and other copyable identifiers.
 * Supports truncation for long values with tooltip showing full text.
 */
export const CopyableText = memo(function CopyableText({
  text,
  copyLabel = 'Copy',
  copiedLabel = 'Copied!',
  maxWidth = 100,
  variant = 'body2',
  monospace = true,
  sx,
}: CopyableTextProps) {
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

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopied(true);
      // Clear any existing timeout before setting new one
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    },
    [text]
  );

  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <Tooltip title={text} placement="top">
        <Typography
          variant={variant}
          fontWeight={500}
          sx={{
            fontFamily: monospace ? 'monospace' : undefined,
            fontSize: monospace ? '0.8rem' : undefined,
            maxWidth,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            ...sx,
          }}
        >
          {text}
        </Typography>
      </Tooltip>
      <Tooltip title={copied ? copiedLabel : copyLabel}>
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{
            p: 0.25,
            '& .MuiSvgIcon-root': { fontSize: '0.9rem' },
          }}
          aria-label={copied ? copiedLabel : copyLabel}
        >
          {copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );
});
