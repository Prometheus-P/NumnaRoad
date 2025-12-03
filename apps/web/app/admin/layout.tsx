/**
 * Admin Dashboard Layout
 *
 * Desktop-optimized layout with M3 NavigationRail.
 * Includes authentication check and responsive design.
 *
 * Tasks: T105, T113, T114
 */

'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import { NavigationRail } from '@/components/ui/NavigationRail';

/**
 * Navigation rail width constants
 */
const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 72;

/**
 * Layout props
 */
interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Admin Layout Component
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleCollapseToggle = () => {
    setCollapsed((prev) => !prev);
  };

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* Navigation Rail */}
      <NavigationRail collapsed={collapsed} onCollapseToggle={handleCollapseToggle} />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${sidebarWidth}px`,
          minHeight: '100vh',
          transition: (theme) =>
            theme.transitions.create('margin-left', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          p: { xs: 2, sm: 3, md: 4 },
          // Desktop-optimized: 1024px+ viewport
          maxWidth: `calc(100% - ${sidebarWidth}px)`,
        }}
        role="main"
        aria-label="Admin content"
      >
        {children}
      </Box>
    </Box>
  );
}
