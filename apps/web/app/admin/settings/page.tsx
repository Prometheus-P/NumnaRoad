'use client';

import React, { useState, useCallback } from 'react';
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
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import {
  useAdminSettings,
  useUpdateSettings,
  useSettingsAuditLogs,
  useTestConnection,
  getCategoryLabel,
  getCategoryDescription,
  type SettingCategory,
  type ParsedSetting,
  type AuditLogEntry,
} from '@/hooks/admin';

// =============================================================================
// Types
// =============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// =============================================================================
// Components
// =============================================================================

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function SecretField({
  setting,
  value,
  onChange,
}: {
  setting: ParsedSetting;
  value: string;
  onChange: (value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  const displayValue = showPassword ? value : setting.displayValue || '';

  return (
    <TextField
      label={setting.label}
      type={showPassword ? 'text' : 'password'}
      value={showPassword ? value : displayValue}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      size="small"
      helperText={setting.description}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
              <IconButton size="small" onClick={handleCopy}>
                <ContentCopyIcon
                  fontSize="small"
                  color={copied ? 'success' : 'inherit'}
                />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

function SettingField({
  setting,
  value,
  onChange,
}: {
  setting: ParsedSetting;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
}) {
  if (setting.valueType === 'boolean') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={value as boolean}
            onChange={(e) => onChange(e.target.checked)}
          />
        }
        label={setting.label}
      />
    );
  }

  if (setting.isSensitive) {
    return (
      <SecretField
        setting={setting}
        value={value as string}
        onChange={onChange}
      />
    );
  }

  return (
    <TextField
      label={setting.label}
      type={setting.valueType === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) =>
        onChange(
          setting.valueType === 'number'
            ? Number(e.target.value)
            : e.target.value
        )
      }
      fullWidth
      size="small"
      helperText={setting.description}
    />
  );
}

function TestConnectionButton({
  type,
  label,
}: {
  type: string;
  label: string;
}) {
  const { mutate, isPending, data, reset } = useTestConnection();

  const handleTest = () => {
    reset();
    mutate(type);
  };

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Button
        variant="outlined"
        size="small"
        onClick={handleTest}
        disabled={isPending}
        startIcon={isPending ? <CircularProgress size={16} /> : <RefreshIcon />}
      >
        Test {label}
      </Button>
      {data && (
        <Chip
          size="small"
          icon={data.success ? <CheckCircleIcon /> : <ErrorIcon />}
          label={data.success ? data.message : data.error}
          color={data.success ? 'success' : 'error'}
          variant="outlined"
        />
      )}
    </Box>
  );
}

function CategorySettings({
  category,
  settings,
  values,
  onChange,
}: {
  category: SettingCategory;
  settings: ParsedSetting[];
  values: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
}) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600}>
          {getCategoryLabel(category)}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {getCategoryDescription(category)}
        </Typography>
        <Divider sx={{ my: 2 }} />

        {/* Test Connection Buttons */}
        {category === 'notifications' && (
          <Box mb={3} display="flex" gap={2} flexWrap="wrap">
            <TestConnectionButton type="telegram" label="Telegram" />
            <TestConnectionButton type="email" label="Email" />
          </Box>
        )}
        {category === 'esim_providers' && (
          <Box mb={3} display="flex" gap={2} flexWrap="wrap">
            <TestConnectionButton type="redteago" label="RedteaGO" />
            <TestConnectionButton type="airalo" label="Airalo" />
          </Box>
        )}
        {category === 'integrations' && (
          <Box mb={3} display="flex" gap={2} flexWrap="wrap">
            <TestConnectionButton type="smartstore" label="SmartStore" />
          </Box>
        )}

        <Grid container spacing={2}>
          {settings.map((setting) => (
            <Grid
              key={setting.key}
              size={{
                xs: 12,
                md: setting.valueType === 'boolean' ? 12 : 6,
              }}
            >
              <SettingField
                setting={setting}
                value={
                  values[setting.key] !== undefined
                    ? values[setting.key]
                    : (typeof setting.value === 'object'
                        ? JSON.stringify(setting.value)
                        : setting.value as string | number | boolean)
                }
                onChange={(value) => onChange(setting.key, value)}
              />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

function AuditLogTab() {
  const { data, isLoading, error } = useSettingsAuditLogs({ limit: 50 });

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load audit logs</Alert>;
  }

  if (!data?.items.length) {
    return (
      <Alert severity="info" icon={<HistoryIcon />}>
        No audit logs yet. Changes to settings will appear here.
      </Alert>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Setting</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Changed By</TableCell>
            <TableCell>Old Value</TableCell>
            <TableCell>New Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.items.map((log: AuditLogEntry) => (
            <TableRow key={log.id}>
              <TableCell>
                {new Date(log.createdAt).toLocaleString('ko-KR')}
              </TableCell>
              <TableCell>
                <Chip label={getCategoryLabel(log.category)} size="small" />
              </TableCell>
              <TableCell>{log.key}</TableCell>
              <TableCell>
                <Chip
                  label={log.action}
                  size="small"
                  color={log.action === 'create' ? 'success' : 'primary'}
                />
              </TableCell>
              <TableCell>{log.changedBy}</TableCell>
              <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {log.oldValue || '-'}
              </TableCell>
              <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {log.newValue}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SettingsPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [changes, setChanges] = useState<
    Record<string, Record<string, string | number | boolean>>
  >({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const { data: settings, isLoading, error, refetch } = useAdminSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateSettings();

  const categories: SettingCategory[] = [
    'general',
    'esim_providers',
    'notifications',
    'integrations',
  ];

  const handleChange = useCallback(
    (category: SettingCategory, key: string, value: string | number | boolean) => {
      setChanges((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value,
        },
      }));
    },
    []
  );

  const handleSave = useCallback(() => {
    const updates: Array<{
      category: SettingCategory;
      key: string;
      value: string | number | boolean;
    }> = [];

    for (const [category, categoryChanges] of Object.entries(changes)) {
      for (const [key, value] of Object.entries(categoryChanges)) {
        updates.push({
          category: category as SettingCategory,
          key,
          value,
        });
      }
    }

    if (updates.length === 0) {
      setSnackbar({
        open: true,
        message: 'No changes to save',
        severity: 'info' as 'success',
      });
      return;
    }

    updateSettings(updates, {
      onSuccess: () => {
        setChanges({});
        setSnackbar({
          open: true,
          message: `${updates.length} setting(s) saved successfully`,
          severity: 'success',
        });
        refetch();
      },
      onError: (err: Error) => {
        setSnackbar({
          open: true,
          message: err.message || 'Failed to save settings',
          severity: 'error',
        });
      },
    });
  }, [changes, updateSettings, refetch]);

  const hasChanges = Object.keys(changes).some(
    (cat) => Object.keys(changes[cat]).length > 0
  );

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={48} sx={{ my: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load settings: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Settings
        </Typography>
        <Button
          variant="contained"
          startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
          {hasChanges && (
            <Chip
              size="small"
              label={Object.values(changes).reduce(
                (sum, c) => sum + Object.keys(c).length,
                0
              )}
              sx={{ ml: 1 }}
              color="warning"
            />
          )}
        </Button>
      </Box>

      <Tabs
        value={tabIndex}
        onChange={(_, newValue) => setTabIndex(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
      >
        {categories.map((cat) => (
          <Tab key={cat} label={getCategoryLabel(cat)} />
        ))}
        <Tab label="Audit Log" icon={<HistoryIcon />} iconPosition="start" />
      </Tabs>

      {categories.map((category, index) => (
        <TabPanel key={category} value={tabIndex} index={index}>
          {settings && (
            <CategorySettings
              category={category}
              settings={settings[category]}
              values={changes[category] || {}}
              onChange={(key, value) => handleChange(category, key, value)}
            />
          )}
        </TabPanel>
      ))}

      <TabPanel value={tabIndex} index={4}>
        <AuditLogTab />
      </TabPanel>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
