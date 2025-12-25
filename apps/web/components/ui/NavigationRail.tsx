'use client';

import React from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import SettingsIcon from '@mui/icons-material/Settings';
import InventoryIcon from '@mui/icons-material/Inventory';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Types for NavigationRail component
interface NavItem {
  id: string;
  label: string;
  iconName: string; // Used to map to MUI Icons
  href: string;
}

interface NavigationRailProps {
  items: NavItem[];
  // activeItemId is now derived from href/pathname
  onItemClick?: (item: NavItem) => void;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  labels?: {
    collapseNav?: string;
    expandNav?: string;
  };
}

// Map icon names to actual MUI icons
const IconMap: Record<string, React.ElementType> = {
  Dashboard: DashboardIcon,
  ShoppingCart: ShoppingCartIcon,
  CloudQueue: CloudQueueIcon,
  Settings: SettingsIcon,
  Inventory: InventoryIcon,
};

/**
 * M3 Navigation Rail Component
 * Displays navigation items for the admin dashboard.
 * Supports collapsed/expanded states and highlights the active item.
 */
export function NavigationRail({
  items,
  onItemClick,
  collapsed = false,
  onCollapseToggle,
  labels = {},
}: NavigationRailProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Example: collapse on small screens

  const {
    collapseNav = 'Collapse navigation',
    expandNav = 'Expand navigation',
  } = labels;

  // Render icon based on iconName
  const renderIcon = (iconName: string) => {
    const IconComponent = IconMap[iconName];
    return IconComponent ? <IconComponent /> : <DashboardIcon />; // Default icon
  };

  return (
    <Box
      sx={{
        width: collapsed ? theme.spacing(9) : theme.spacing(28), // Adjust width based on collapsed state
        height: '100vh',
        bgcolor: 'background.paper',
        borderRight: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 2,
        pb: 2,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        overflowX: 'hidden',
        [theme.breakpoints.down('sm')]: {
          width: collapsed ? 0 : '100vw', // Hide completely on mobile if collapsed
          position: 'fixed',
          zIndex: theme.zIndex.drawer + 1,
        },
      }}
      role="navigation"
      aria-label="Admin navigation"
    >
      {/* Toggle button */}
      {onCollapseToggle && (
        <IconButton
          onClick={onCollapseToggle}
          aria-label={collapsed ? expandNav : collapseNav}
          sx={{ mb: 2 }}
        >
          {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </IconButton>
      )}

      <List component="nav" sx={{ width: '100%', px: 1 }}>
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <ListItemButton
              key={item.id}
              component={Link}
              href={item.href}
              selected={isActive}
              onClick={() => onItemClick && onItemClick(item)}
              aria-current={isActive ? 'page' : undefined}
              sx={{
                borderRadius: 2,
                mb: 1,
                justifyContent: collapsed ? 'center' : 'flex-start',
                '&.Mui-selected': {
                  bgcolor: theme.palette.action.selected,
                  color: theme.palette.primary.main,
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                },
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 3, justifyContent: 'center' }}>
                {renderIcon(item.iconName)}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} sx={{ my: 0 }} />}
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

export default NavigationRail;