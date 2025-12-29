'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import CloudIcon from '@mui/icons-material/Cloud';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

export const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/admin',
    icon: <DashboardIcon />,
  },
  {
    label: 'Orders',
    path: '/admin/orders',
    icon: <ShoppingCartIcon />,
    children: [
      { label: 'All Orders', path: '/admin/orders', icon: <AllInboxIcon /> },
      { label: 'Pending', path: '/admin/orders?status=pending', icon: <PendingIcon /> },
      { label: 'Failed', path: '/admin/orders?status=failed', icon: <ErrorIcon /> },
    ],
  },
  {
    label: 'Products',
    path: '/admin/products',
    icon: <InventoryIcon />,
  },
  {
    label: 'Providers',
    path: '/admin/providers',
    icon: <CloudIcon />,
  },
  {
    label: 'SmartStore',
    path: '/admin/smartstore',
    icon: <StorefrontIcon />,
  },
  {
    label: 'Settings',
    path: '/admin/settings',
    icon: <SettingsIcon />,
  },
  {
    label: 'Guide',
    path: '/admin/guide',
    icon: <HelpOutlineIcon />,
  },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({
    '/admin/orders': true,
  });

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      setOpenMenus((prev) => ({
        ...prev,
        [item.path]: !prev[item.path],
      }));
    } else {
      router.push(item.path);
      if (isMobile) {
        onMobileClose();
      }
    }
  };

  const handleChildNavClick = (path: string) => {
    router.push(path);
    if (isMobile) {
      onMobileClose();
    }
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(path.split('?')[0]);
  };

  const drawerContent = (
    <>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" fontWeight={600}>
          NumnaRoad Admin
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: 'auto', py: 1 }}>
        <List disablePadding>
          {navItems.map((item) => (
            <React.Fragment key={item.path}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleNavClick(item)}
                  selected={isActive(item.path) && !item.children}
                  sx={{
                    mx: 1,
                    borderRadius: 2,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                  {item.children && (openMenus[item.path] ? <ExpandLess /> : <ExpandMore />)}
                </ListItemButton>
              </ListItem>
              {item.children && (
                <Collapse in={openMenus[item.path]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItem key={child.path} disablePadding>
                        <ListItemButton
                          onClick={() => handleChildNavClick(child.path)}
                          selected={pathname + (typeof window !== 'undefined' ? window?.location?.search || '' : '') === child.path}
                          sx={{
                            pl: 4,
                            mx: 1,
                            borderRadius: 2,
                            mb: 0.5,
                            '&.Mui-selected': {
                              bgcolor: 'action.selected',
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>{child.icon}</ListItemIcon>
                          <ListItemText
                            primary={child.label}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
    </>
  );

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

export default AdminSidebar;
