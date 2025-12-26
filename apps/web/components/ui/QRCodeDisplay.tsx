'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Skeleton from '@mui/material/Skeleton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export interface QRCodeDisplayProps {
  qrCodeUrl: string;
  activationCode?: string;
  iccid?: string;
  size?: number;
  labels?: {
    qrCode?: string;
    activationCode?: string;
    iccid?: string;
    copyCode?: string;
    copied?: string;
    scanInstructions?: string;
  };
}

/**
 * M3 QR Code Display Component
 * Shows eSIM QR code with activation code and copy functionality
 */
export function QRCodeDisplay({
  qrCodeUrl,
  activationCode,
  size = 200,
  labels = {},
}: QRCodeDisplayProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    qrCode = 'eSIM QR Code',
    activationCode: activationCodeLabel = 'Activation Code',
    copyCode = 'Copy Code',
    copied: copiedLabel = 'Copied!',
    scanInstructions = 'Scan this QR code with your phone camera to install the eSIM',
  } = labels;

  const handleCopy = async () => {
    if (activationCode) {
      try {
        await navigator.clipboard.writeText(activationCode);
        setCopied(true);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setCopied(false);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: 'background.paper',
        textAlign: 'center',
      }}
    >
      {/* Title */}
      <Typography variant="h6" component="h3" gutterBottom>
        {qrCode}
      </Typography>

      {/* QR Code Image */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          my: 2,
          minHeight: size,
        }}
      >
        {!imageLoaded && !imageError && (
          <Skeleton
            variant="rectangular"
            width={size}
            height={size}
            sx={{ borderRadius: 2 }}
          />
        )}
        {imageError ? (
          <Box
            sx={{
              width: size,
              height: size,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              QR Code unavailable
            </Typography>
          </Box>
        ) : (
          <Box
            component="img"
            src={qrCodeUrl}
            alt="QR Code for eSIM installation"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            sx={{
              width: size,
              height: size,
              borderRadius: 2,
              display: imageLoaded ? 'block' : 'none',
              boxShadow: 1,
            }}
          />
        )}
      </Box>

      {/* Scan Instructions */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2, maxWidth: 280, mx: 'auto' }}
      >
        {scanInstructions}
      </Typography>

      {/* Activation Code */}
      {activationCode && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            {activationCodeLabel}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              mt: 1,
            }}
          >
            <Box
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                bgcolor: 'action.hover',
                px: 2,
                py: 1,
                borderRadius: 1,
                wordBreak: 'break-all',
                maxWidth: 250,
                textAlign: 'left',
              }}
            >
              {activationCode}
            </Box>
            <IconButton
              onClick={handleCopy}
              size="small"
              aria-label={copyCode}
              color="primary"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>
          <Button
            variant="text"
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopy}
            sx={{ mt: 1, display: { xs: 'inline-flex', sm: 'none' } }}
          >
            {copyCode}
          </Button>
        </Box>
      )}

      {/* Copy Success Snackbar */}
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        message={copiedLabel}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
}

export default QRCodeDisplay;
