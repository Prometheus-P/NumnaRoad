'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

interface AdminUser {
  id: string;
  email: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  logout: () => void;
}

const AdminAuthContext = React.createContext<AdminAuthContextType>({
  user: null,
  isLoading: true,
  logout: () => {},
});

export function useAdminAuth() {
  return React.useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = React.useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const isLoginPage = pathname === '/admin/login';

  React.useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('admin_token');

      if (!token) {
        setIsLoading(false);
        if (!isLoginPage) {
          router.push('/admin/login');
        }
        return;
      }

      try {
        const res = await fetch('/api/admin/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (data.valid) {
          setUser(data.user);
          if (isLoginPage) {
            router.push('/admin');
          }
        } else {
          localStorage.removeItem('admin_token');
          if (!isLoginPage) {
            router.push('/admin/login');
          }
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        localStorage.removeItem('admin_token');
        if (!isLoginPage) {
          router.push('/admin/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [router, isLoginPage]);

  const logout = () => {
    localStorage.removeItem('admin_token');
    setUser(null);
    router.push('/admin/login');
  };

  // Show loading spinner while verifying auth
  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Allow login page to render without auth
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If not authenticated and not on login page, show nothing (redirect happening)
  if (!user) {
    return null;
  }

  return (
    <AdminAuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
