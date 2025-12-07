'use client';

import React, { useState, useEffect } from 'react';
import { Box, Toolbar, AppBar, IconButton, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import NavigationRail from '../../../components/ui/NavigationRail';
import { usePathname, useRouter } from 'next/navigation';
import pb from '../../lib/pocketbase'; // Import PocketBase client

// Define NavItem structure (from tests/unit/components/NavigationRail.test.tsx)
interface NavItem {
  id: string;
  label: string;
  iconName: string; // Used to map to MUI Icons
  href: string;
}

// Admin Navigation Items
const adminNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', iconName: 'Dashboard', href: '/admin' },
  { id: 'orders', label: 'Orders', iconName: 'ShoppingCart', href: '/admin/orders' },
  { id: 'providers', label: 'Providers', iconName: 'CloudQueue', href: '/admin/providers' },
  { id: 'settings', label: 'Settings', iconName: 'Settings', href: '/admin/settings' },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md')); // Desktop breakpoint
  const [collapsed, setCollapsed] = useState(!isDesktop); // Collapsed by default on mobile
  const [isAuthenticatedAdmin, setIsAuthenticatedAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Ensure authStore is initialized from localStorage
        pb.authStore.loadFromCookie(document.cookie);

        if (!pb.authStore.isValid || pb.authStore.model?.collectionName !== 'admins') {
          router.push('/login'); // Redirect to login if not authenticated or not admin
        } else {
          // Refresh auth to ensure token is still valid on server (optional but good practice)
          await pb.collection('admins').authRefresh();
          setIsAuthenticatedAdmin(true);
        }
      } catch (err) {
        console.error('Authentication check failed:', err);
        router.push('/login'); // Redirect on any auth error
      } finally {
        setLoadingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth store changes
    return pb.authStore.onChange(() => {
      if (!pb.authStore.isValid || pb.authStore.model?.collectionName !== 'admins') {
        setIsAuthenticatedAdmin(false);
        router.push('/login');
      } else {
        setIsAuthenticatedAdmin(true);
      }
    });
  }, [router]);


  const handleCollapseToggle = () => {
    setCollapsed(!collapsed);
  };

  const currentActiveItemId = adminNavItems.find(item => pathname === item.href)?.id || 'dashboard';

  if (loadingAuth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticatedAdmin) {
    // Optionally render a more specific "Unauthorized" message here instead of just loading state
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="h6" color="error">Unauthorized Access</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Navigation Rail */}
      <NavigationRail
        items={adminNavItems}
        collapsed={collapsed}
        onCollapseToggle={handleCollapseToggle}
        activeItemId={currentActiveItemId}
      />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ml: collapsed && isDesktop ? `${theme.spacing(9)}` : (isDesktop ? `${theme.spacing(28)}` : 0),
          [theme.breakpoints.down('sm')]: {
            ml: 0, // No left margin on mobile
            ...(collapsed ? {} : { display: 'none' }), // Hide main content if nav is open on mobile
          },
        }}
      >
        {/* Top AppBar for mobile/collapsed state */}
        {!isDesktop && (
          <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 2 }}>
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleCollapseToggle}
                edge="start"
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div">
                Admin Dashboard
              </Typography>
            </Toolbar>
          </AppBar>
        )}
        {!isDesktop && <Toolbar />} {/* Add spacing for AppBar on mobile */}
        {children}
      </Box>
    </Box>
  );
}