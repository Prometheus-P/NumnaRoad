'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface SettingsSection {
  title: string;
  description?: string;
  fields: SettingsField[];
}

interface SettingsField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'email' | 'number' | 'toggle';
  value: string | boolean;
  placeholder?: string;
  helperText?: string;
  masked?: boolean;
  readOnly?: boolean;
}

// Password Field Component
function PasswordField({
  label,
  value,
  onChange,
  helperText,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  readOnly?: boolean;
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // Mask the value for display
  const displayValue = showPassword ? value : value ? '•'.repeat(Math.min(value.length, 20)) : '';

  return (
    <TextField
      label={label}
      type={showPassword ? 'text' : 'password'}
      value={displayValue}
      onChange={(e) => !readOnly && onChange(e.target.value)}
      fullWidth
      helperText={helperText}
      disabled={readOnly}
      InputProps={{
        readOnly,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
            <IconButton onClick={handleCopy} edge="end">
              <ContentCopyIcon color={copied ? 'success' : 'inherit'} />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

export default function SettingsPage() {
  const [saved, setSaved] = React.useState(false);
  const savedTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  // Settings data - in production, would be fetched from API
  const settings: SettingsSection[] = [
    {
      title: 'General Settings',
      fields: [
        {
          key: 'siteName',
          label: 'Site Name',
          type: 'text',
          value: 'NumnaRoad',
        },
        {
          key: 'currency',
          label: 'Default Currency',
          type: 'text',
          value: 'KRW',
        },
        {
          key: 'timezone',
          label: 'Timezone',
          type: 'text',
          value: 'Asia/Seoul',
        },
      ],
    },
    {
      title: 'Payment Settings',
      description: 'Stripe configuration',
      fields: [
        {
          key: 'stripePublishableKey',
          label: 'Stripe Publishable Key',
          type: 'password',
          value: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_...',
          masked: true,
          readOnly: true,
          helperText: 'Set via environment variable',
        },
        {
          key: 'stripeWebhookUrl',
          label: 'Webhook URL',
          type: 'url',
          value: 'https://numnaroad.vercel.app/api/webhooks/stripe',
          readOnly: true,
        },
      ],
    },
    {
      title: 'Email Settings',
      description: 'Resend email configuration',
      fields: [
        {
          key: 'senderEmail',
          label: 'Sender Email',
          type: 'email',
          value: 'noreply@numnaroad.com',
        },
        {
          key: 'senderName',
          label: 'Sender Name',
          type: 'text',
          value: 'NumnaRoad',
        },
        {
          key: 'resendApiKey',
          label: 'Resend API Key',
          type: 'password',
          value: 're_...',
          masked: true,
          readOnly: true,
          helperText: 'Set via environment variable',
        },
      ],
    },
    {
      title: 'Notification Settings',
      description: 'Discord webhook for alerts',
      fields: [
        {
          key: 'discordWebhook',
          label: 'Discord Webhook URL',
          type: 'url',
          value: '',
          placeholder: 'https://discord.com/api/webhooks/...',
        },
        {
          key: 'notifyOnFailure',
          label: 'Notify on Order Failure',
          type: 'toggle',
          value: true,
        },
        {
          key: 'notifyOnNewOrder',
          label: 'Notify on New Order',
          type: 'toggle',
          value: false,
        },
      ],
    },
    {
      title: 'Provider API Keys',
      description: 'API keys for eSIM providers (stored securely)',
      fields: [
        {
          key: 'airaloApiKey',
          label: 'Airalo API Key',
          type: 'password',
          value: 'configured',
          masked: true,
          readOnly: true,
          helperText: 'Set via environment variable',
        },
        {
          key: 'esimcardApiKey',
          label: 'eSIM Card API Key',
          type: 'password',
          value: 'configured',
          masked: true,
          readOnly: true,
          helperText: 'Set via environment variable',
        },
        {
          key: 'mobimatterApiKey',
          label: 'MobiMatter API Key',
          type: 'password',
          value: 'not configured',
          masked: true,
          readOnly: true,
          helperText: 'Set via environment variable',
        },
      ],
    },
  ];

  const handleSave = () => {
    // In production, would save to API
    setSaved(true);
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
    }
    savedTimeoutRef.current = setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Settings
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully
        </Alert>
      )}

      <Grid container spacing={3}>
        {settings.map((section) => (
          <Grid key={section.title} size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600}>
                  {section.title}
                </Typography>
                {section.description && (
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {section.description}
                  </Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  {section.fields.map((field) => (
                    <Grid key={field.key} size={{ xs: 12, md: field.type === 'toggle' ? 12 : 6 }}>
                      {field.type === 'toggle' ? (
                        <FormControlLabel
                          control={<Switch checked={field.value as boolean} />}
                          label={field.label}
                        />
                      ) : field.type === 'password' ? (
                        <PasswordField
                          label={field.label}
                          value={field.value as string}
                          onChange={() => {}}
                          helperText={field.helperText}
                          readOnly={field.readOnly}
                        />
                      ) : (
                        <TextField
                          label={field.label}
                          type={field.type}
                          defaultValue={field.value}
                          placeholder={field.placeholder}
                          helperText={field.helperText}
                          fullWidth
                          disabled={field.readOnly}
                        />
                      )}
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Danger Zone */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} color="error">
                Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Irreversible actions
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Clear All Data
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This will permanently delete all orders and data
                  </Typography>
                </Box>
                <Button variant="outlined" color="error" disabled>
                  Clear Data
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
