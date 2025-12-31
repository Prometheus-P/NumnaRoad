'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminSidebar, DRAWER_WIDTH } from '@/components/admin/AdminSidebar';
import { AdminAuthProvider, useAdminAuth } from '@/components/admin/AdminAuthProvider';
import { AdminLanguageProvider, useAdminLanguage } from '@/lib/i18n';
import { SkipLink } from '@/components/layout/SkipLink';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();
  const { t, locale, toggleLocale } = useAdminLanguage();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isLoginPage = pathname === '/admin/login';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  // Login page has no layout chrome
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <SkipLink mainContentId="admin-main-content" label="메인 콘텐츠로 건너뛰기" />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          {/* Hamburger menu for mobile */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              display: { md: 'none' },
              color: 'text.primary',
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Mobile title */}
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              color: 'text.primary',
              display: { xs: 'block', md: 'none' },
              fontWeight: 600,
            }}
          >
            {t.sidebar.title}
          </Typography>

          {/* Desktop spacer */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />

          {/* Language toggle button */}
          <IconButton
            size="small"
            onClick={toggleLocale}
            sx={{
              mr: 1,
              px: 1,
              borderRadius: 1,
              bgcolor: 'action.hover',
              color: 'text.primary',
              fontWeight: 600,
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: 'action.selected',
              },
            }}
          >
            {locale === 'ko' ? 'EN' : '한'}
          </IconButton>

          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
              {locale === 'ko' ? '로그아웃' : 'Logout'}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        id="admin-main-content"
        role="main"
        aria-label="관리자 메인 콘텐츠"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px',
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
          outline: 'none',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <AdminLanguageProvider>
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminLanguageProvider>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
