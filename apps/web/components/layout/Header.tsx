'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme,
  Container,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SimCardIcon from '@mui/icons-material/SimCard';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoIcon from '@mui/icons-material/Info';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: '상품', href: '/ko/products', icon: <SimCardIcon /> },
  { label: '이용 가이드', href: '/ko/guide', icon: <HelpOutlineIcon /> },
  { label: '고객센터', href: '/ko/support', icon: <InfoIcon /> },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const navId = useId();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
    // Return focus to menu button when drawer closes
    menuButtonRef.current?.focus();
  };

  // Focus management for drawer
  useEffect(() => {
    if (mobileOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [mobileOpen]);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const drawer = (
    <Box
      sx={{ width: 280, pt: 2 }}
      role="dialog"
      aria-modal="true"
      aria-label="네비게이션 메뉴"
    >
      <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700} color="primary">
          NumnaRoad
        </Typography>
        <IconButton
          ref={closeButtonRef}
          onClick={handleDrawerClose}
          aria-label="메뉴 닫기"
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List component="nav" aria-label="메인 네비게이션">
        {navItems.map((item) => (
          <ListItem key={item.href} disablePadding>
            <ListItemButton
              component={Link}
              href={item.href}
              selected={isActive(item.href)}
              onClick={handleDrawerClose}
              aria-current={isActive(item.href) ? 'page' : undefined}
              sx={{
                mx: 1,
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <List component="nav" aria-label="관리자 메뉴">
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="/admin"
            onClick={handleDrawerClose}
            sx={{
              mx: 1,
              borderRadius: 2,
              color: 'text.secondary',
            }}
          >
            <AdminPanelSettingsIcon sx={{ mr: 1, fontSize: 20 }} aria-hidden="true" />
            <ListItemText primary="관리자" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 56, md: 64 } }}>
            {/* Logo */}
            <Typography
              variant="h6"
              component={Link}
              href="/ko"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
                mr: 4,
              }}
            >
              NumnaRoad
            </Typography>

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box
                component="nav"
                id={navId}
                aria-label="메인 네비게이션"
                sx={{ display: 'flex', gap: 1, flexGrow: 1 }}
              >
                {navItems.map((item) => (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    sx={{
                      color: isActive(item.href) ? 'primary.main' : 'text.primary',
                      fontWeight: isActive(item.href) ? 600 : 400,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            )}

            {/* Spacer for mobile */}
            {isMobile && <Box sx={{ flexGrow: 1 }} />}

            {/* Admin Link (Desktop) */}
            {!isMobile && (
              <Button
                component={Link}
                href="/admin"
                startIcon={<AdminPanelSettingsIcon />}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                관리자
              </Button>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                ref={menuButtonRef}
                color="inherit"
                aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
                aria-expanded={mobileOpen}
                aria-haspopup="dialog"
                edge="end"
                onClick={handleDrawerToggle}
                sx={{ color: 'text.primary' }}
              >
                <MenuIcon aria-hidden="true" />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerClose}
        ModalProps={{
          keepMounted: true,
          'aria-labelledby': 'mobile-nav-title',
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}

export default Header;
