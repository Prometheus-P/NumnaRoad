'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

interface QRCodeDisplayProps {
  qrCodeUrl: string;
  activationCode?: string;
  installationInstructions?: string;
  labels?: {
    activationCode?: string;
    installationInstructionsTitle?: string;
  };
}

export function QRCodeDisplay({
  qrCodeUrl,
  activationCode,
  installationInstructions,
  labels = {},
}: QRCodeDisplayProps) {
  const {
    activationCode: activationCodeLabel = 'Activation Code',
    installationInstructionsTitle = 'Installation Instructions',
  } = labels;

  return (
    <>
      <Divider sx={{ my: 2 }} />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
        }}
      >
        <Box
          component="img"
          src={qrCodeUrl}
          alt="QR Code for eSIM installation"
          role="img"
          sx={{
            width: 200,
            height: 200,
            borderRadius: 2,
            mb: 2,
          }}
        />
        {activationCode && (
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="caption" color="text.secondary">
              {activationCodeLabel}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                wordBreak: 'break-all',
                bgcolor: 'action.hover',
                p: 1,
                borderRadius: 1,
                mt: 0.5,
              }}
            >
              {activationCode}
            </Typography>
          </Box>
        )}
        {installationInstructions && (
          <Box sx={{ mt: 3, textAlign: 'left', width: '100%' }}>
            <Typography variant="subtitle2" gutterBottom>
              {installationInstructionsTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {installationInstructions}
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
}

export default QRCodeDisplay;