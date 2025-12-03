/**
 * NavigationRail Component
 *
 * M3-styled navigation rail for admin dashboard.
 * Desktop-optimized with collapse/expand functionality.
 *
 * Task: T101
 */

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * Navigation item definition
 */
export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

/**
 * Component props
 */
export interface NavigationRailProps {
  collapsed?: boolean;
  onCollapseToggle?: () => void;
}

/**
 * Default navigation items
 */
const defaultNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, href: '/admin' },
  { id: 'orders', label: 'Orders', icon: <ShoppingCartIcon />, href: '/admin/orders' },
  { id: 'providers', label: 'Providers', icon: <CloudQueueIcon />, href: '/admin/providers' },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon />, href: '/admin/settings' },
];

/**
 * Navigation rail widths
 */
const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 72;

/**
 * NavigationRail Component
 */
export function NavigationRail({
  collapsed = false,
  onCollapseToggle,
}: NavigationRailProps) {
  const theme = useTheme();
  const pathname = usePathname();

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  /**
   * Check if nav item is active
   */
  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <Box
      component="nav"
      role="navigation"
      aria-label="Admin navigation"
      data-testid="navigation-rail"
      sx={{
        width,
        minWidth: width,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        overflow: 'hidden',
      }}
    >
      {/* Logo / Brand */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          px: collapsed ? 1.5 : 2,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        {!collapsed && (
          <Typography
            variant="h6"
            component="span"
            sx={{
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            NumnaRoad
          </Typography>
        )}
        {collapsed && (
          <Typography
            variant="h6"
            component="span"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
            }}
          >
            NR
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List sx={{ flex: 1, py: 1 }}>
        {defaultNavItems.map((item) => {
          const active = isActive(item.href);

          const button = (
            <ListItemButton
              component={Link}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              data-testid={`nav-item-${item.id}`}
              sx={{
                minHeight: 48,
                px: 2,
                mx: 1,
                borderRadius: 2,
                justifyContent: collapsed ? 'center' : 'flex-start',
                bgcolor: active
                  ? alpha(theme.palette.primary.main, 0.12)
                  : 'transparent',
                '&:hover': {
                  bgcolor: active
                    ? alpha(theme.palette.primary.main, 0.16)
                    : alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 40,
                  color: active ? 'primary.main' : 'text.secondary',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: active ? 600 : 400,
                    color: active ? 'primary.main' : 'text.primary',
                  }}
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.id} disablePadding>
              {collapsed ? (
                <Tooltip title={item.label} placement="right" arrow>
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Collapse Toggle */}
      {onCollapseToggle && (
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <Tooltip
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            placement="right"
          >
            <IconButton
              onClick={onCollapseToggle}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              data-testid={collapsed ? 'expand-button' : 'collapse-button'}
              sx={{
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

export default NavigationRail;
