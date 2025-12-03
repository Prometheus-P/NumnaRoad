/**
 * InstallationGuide Component
 *
 * Step-by-step eSIM installation instructions with i18n support.
 * Provides instructions for both iOS and Android devices.
 *
 * Task: T089
 */

'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Alert from '@mui/material/Alert';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import AndroidIcon from '@mui/icons-material/Android';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * Component props
 */
export interface InstallationGuideProps {
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Default platform tab */
  defaultPlatform?: 'ios' | 'android';
  /** Custom translations (optional) */
  translations?: InstallationTranslations;
}

/**
 * Translation structure
 */
interface InstallationTranslations {
  title?: string;
  iosTab?: string;
  androidTab?: string;
  beforeYouStart?: string;
  beforeYouStartText?: string;
  iosSteps?: string[];
  androidSteps?: string[];
  importantNotes?: string;
  notes?: string[];
  troubleshooting?: string;
  troubleshootingSteps?: string[];
}

/**
 * Default English translations
 */
const DEFAULT_TRANSLATIONS: Required<InstallationTranslations> = {
  title: 'Installation Guide',
  iosTab: 'iPhone / iPad',
  androidTab: 'Android',
  beforeYouStart: 'Before You Start',
  beforeYouStartText:
    'Make sure you have a stable Wi-Fi connection. Your device must support eSIM functionality.',
  iosSteps: [
    'Open Settings on your iPhone',
    'Tap "Cellular" or "Mobile Data"',
    'Tap "Add eSIM" or "Add Cellular Plan"',
    'Choose "Use QR Code"',
    'Scan the QR code above',
    'Wait for the eSIM to download and activate',
    'Label the plan (e.g., "Travel Data")',
    'Choose this plan for data while traveling',
  ],
  androidSteps: [
    'Open Settings on your Android device',
    'Tap "Network & Internet" or "Connections"',
    'Tap "SIMs" or "Mobile Networks"',
    'Tap "Add" or "+" to add a new SIM',
    'Select "Download a SIM instead"',
    'Scan the QR code above',
    'Wait for the eSIM to activate',
    'Enable the eSIM for mobile data',
  ],
  importantNotes: 'Important Notes',
  notes: [
    'Do NOT delete the eSIM after installation - you cannot re-download it',
    'The eSIM activates when you connect to a network in the destination country',
    'Keep your primary SIM active for calls and texts',
    'Data usage counts from first connection abroad',
  ],
  troubleshooting: 'Troubleshooting',
  troubleshootingSteps: [
    'Restart your device if the eSIM does not appear',
    'Ensure you have the latest OS version',
    'Check that your device supports eSIM',
    'Contact support if issues persist',
  ],
};

/**
 * Tab panel component
 */
interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`installation-tabpanel-${index}`}
      aria-labelledby={`installation-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

/**
 * Installation step list component
 */
function StepList({ steps }: { steps: string[] }) {
  const theme = useTheme();

  return (
    <List dense disablePadding>
      {steps.map((step, index) => (
        <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
              aria-hidden="true"
            >
              {index + 1}
            </Box>
          </ListItemIcon>
          <ListItemText
            primary={step}
            primaryTypographyProps={{
              variant: 'body2',
            }}
          />
        </ListItem>
      ))}
    </List>
  );
}

/**
 * InstallationGuide Component
 */
export function InstallationGuide({
  compact = false,
  defaultPlatform = 'ios',
  translations,
}: InstallationGuideProps) {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(defaultPlatform === 'ios' ? 0 : 1);

  // Merge custom translations with defaults
  const t: Required<InstallationTranslations> = {
    ...DEFAULT_TRANSLATIONS,
    ...translations,
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (compact) {
    // Compact mode: accordion-based layout
    return (
      <Box data-testid="installation-guide">
        <Accordion defaultExpanded={false}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="installation-content"
            id="installation-header"
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t.title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              aria-label="Installation platform selection"
            >
              <Tab
                icon={<PhoneIphoneIcon />}
                label={t.iosTab}
                id="installation-tab-0"
                aria-controls="installation-tabpanel-0"
              />
              <Tab
                icon={<AndroidIcon />}
                label={t.androidTab}
                id="installation-tab-1"
                aria-controls="installation-tabpanel-1"
              />
            </Tabs>
            <TabPanel value={tabValue} index={0}>
              <StepList steps={t.iosSteps} />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <StepList steps={t.androidSteps} />
            </TabPanel>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  }

  // Full mode: expanded layout with all sections
  return (
    <Box data-testid="installation-guide">
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: 600 }}
        id="installation-guide-title"
      >
        {t.title}
      </Typography>

      {/* Warning Alert */}
      <Alert
        severity="info"
        icon={<WarningAmberIcon />}
        sx={{ mb: 3, borderRadius: 2 }}
        role="note"
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {t.beforeYouStart}
        </Typography>
        <Typography variant="body2">{t.beforeYouStartText}</Typography>
      </Alert>

      {/* Platform Tabs */}
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          mb: 2,
          '& .MuiTab-root': {
            minHeight: 56,
          },
        }}
        aria-label="Installation platform selection"
      >
        <Tab
          icon={<PhoneIphoneIcon />}
          label={t.iosTab}
          id="installation-tab-0"
          aria-controls="installation-tabpanel-0"
        />
        <Tab
          icon={<AndroidIcon />}
          label={t.androidTab}
          id="installation-tab-1"
          aria-controls="installation-tabpanel-1"
        />
      </Tabs>

      {/* Platform-specific Steps */}
      <TabPanel value={tabValue} index={0}>
        <StepList steps={t.iosSteps} />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <StepList steps={t.androidSteps} />
      </TabPanel>

      {/* Important Notes */}
      <Box sx={{ mt: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <WarningAmberIcon fontSize="small" color="warning" />
          {t.importantNotes}
        </Typography>
        <List dense disablePadding>
          {t.notes.map((note, index) => (
            <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <CheckCircleOutlineIcon
                  fontSize="small"
                  sx={{ color: alpha(theme.palette.text.primary, 0.5) }}
                />
              </ListItemIcon>
              <ListItemText
                primary={note}
                primaryTypographyProps={{
                  variant: 'body2',
                  color: 'text.secondary',
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Troubleshooting */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="troubleshooting-content"
          id="troubleshooting-header"
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {t.troubleshooting}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense disablePadding>
            {t.troubleshootingSteps.map((step, index) => (
              <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                <ListItemText
                  primary={`${index + 1}. ${step}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export default InstallationGuide;
