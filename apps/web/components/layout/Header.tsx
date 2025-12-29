'use client';

import React, { useState } from 'react';
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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const drawer = (
    <Box sx={{ width: 280, pt: 2 }}>
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="h6" fontWeight={700} color="primary">
          NumnaRoad
        </Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.href} disablePadding>
            <ListItemButton
              component={Link}
              href={item.href}
              selected={isActive(item.href)}
              onClick={handleDrawerToggle}
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
      <List>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="/admin"
            onClick={handleDrawerToggle}
            sx={{
              mx: 1,
              borderRadius: 2,
              color: 'text.secondary',
            }}
          >
            <AdminPanelSettingsIcon sx={{ mr: 1, fontSize: 20 }} />
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
              <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
                {navItems.map((item) => (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
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
                color="inherit"
                aria-label="open drawer"
                edge="end"
                onClick={handleDrawerToggle}
                sx={{ color: 'text.primary' }}
              >
                <MenuIcon />
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
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
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
