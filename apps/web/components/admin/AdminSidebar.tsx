'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { useAdminLanguage } from '@/lib/i18n';

export const DRAWER_WIDTH = 260;

interface NavItem {
  id: string;
  path: string;
  icon: React.ReactNode;
  children?: { id: string; path: string; icon: React.ReactNode }[];
}

// Navigation items structure (labels come from translations)
const navItemsConfig: NavItem[] = [
  {
    id: 'dashboard',
    path: '/admin',
    icon: <DashboardIcon />,
  },
  {
    id: 'orders',
    path: '/admin/orders',
    icon: <ShoppingCartIcon />,
    children: [
      { id: 'allOrders', path: '/admin/orders', icon: <AllInboxIcon /> },
      { id: 'pending', path: '/admin/orders?status=pending', icon: <PendingIcon /> },
      { id: 'failed', path: '/admin/orders?status=failed', icon: <ErrorIcon /> },
    ],
  },
  {
    id: 'products',
    path: '/admin/products',
    icon: <InventoryIcon />,
  },
  {
    id: 'providers',
    path: '/admin/providers',
    icon: <CloudIcon />,
  },
  {
    id: 'smartstore',
    path: '/admin/smartstore',
    icon: <StorefrontIcon />,
  },
  {
    id: 'settings',
    path: '/admin/settings',
    icon: <SettingsIcon />,
  },
  {
    id: 'guide',
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
  const searchParams = useSearchParams();
  const theme = useTheme();
  const { t } = useAdminLanguage();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({
    '/admin/orders': true,
  });

  // Compute current full path including query params for child item selection
  const currentFullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

  // Get label from translations
  const getLabel = (id: string): string => {
    const labels: Record<string, string> = {
      dashboard: t.sidebar.dashboard,
      orders: t.sidebar.orders,
      allOrders: t.sidebar.allOrders,
      pending: t.sidebar.pending,
      failed: t.sidebar.failed,
      products: t.sidebar.products,
      providers: t.sidebar.providers,
      smartstore: t.sidebar.smartstore,
      settings: t.sidebar.settings,
      guide: t.sidebar.guide,
    };
    return labels[id] || id;
  };

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
        <Typography variant="h6" noWrap component="div" fontWeight={600} id="admin-sidebar-title">
          {t.sidebar.title}
        </Typography>
      </Toolbar>
      <Divider />
      <Box
        component="nav"
        aria-labelledby="admin-sidebar-title"
        sx={{ overflow: 'auto', py: 1 }}
      >
        <List disablePadding component="ul" role="menubar" aria-label="관리자 메뉴">
          {navItemsConfig.map((item) => {
            const isItemActive = isActive(item.path) && !item.children;
            const isExpanded = !!openMenus[item.path];

            return (
              <React.Fragment key={item.path}>
                <ListItem disablePadding component="li" role="none">
                  <ListItemButton
                    onClick={() => handleNavClick(item)}
                    selected={isItemActive}
                    role="menuitem"
                    aria-current={isItemActive ? 'page' : undefined}
                    aria-expanded={item.children ? isExpanded : undefined}
                    aria-haspopup={item.children ? 'menu' : undefined}
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
                    <ListItemIcon sx={{ minWidth: 40 }} aria-hidden="true">
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={getLabel(item.id)} />
                    {item.children && (
                      <Box aria-hidden="true">
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </Box>
                    )}
                  </ListItemButton>
                </ListItem>
                {item.children && (
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List
                      component="ul"
                      disablePadding
                      role="menu"
                      aria-label={`${getLabel(item.id)} 하위 메뉴`}
                    >
                      {item.children.map((child) => {
                        const isChildActive = currentFullPath === child.path;
                        return (
                          <ListItem key={child.path} disablePadding component="li" role="none">
                            <ListItemButton
                              onClick={() => handleChildNavClick(child.path)}
                              selected={isChildActive}
                              role="menuitem"
                              aria-current={isChildActive ? 'page' : undefined}
                              sx={{
                                pl: 4,
                                mx: 1,
                                borderRadius: 2,
                                mb: 0.5,
                                transition: 'all 0.15s ease-in-out',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                                '&:active': {
                                  bgcolor: 'action.selected',
                                  transform: 'scale(0.98)',
                                },
                                '&.Mui-selected': {
                                  bgcolor: 'primary.light',
                                  color: 'primary.dark',
                                  '&:hover': {
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                  },
                                  '& .MuiListItemIcon-root': {
                                    color: 'primary.dark',
                                  },
                                },
                                // Respect reduced motion
                                '@media (prefers-reduced-motion: reduce)': {
                                  transition: 'none',
                                  '&:active': {
                                    transform: 'none',
                                  },
                                },
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 36 }} aria-hidden="true">
                                {child.icon}
                              </ListItemIcon>
                              <ListItemText
                                primary={getLabel(child.id)}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          })}
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
          'aria-labelledby': 'admin-sidebar-title',
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
        aria-labelledby="admin-sidebar-title"
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
