/**
 * Order Not Found Page
 *
 * Displayed when an order cannot be found.
 *
 * Task: T090
 */

import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import Link from 'next/link';

export default function OrderNotFound() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 4, sm: 8 },
        px: { xs: 2, sm: 3 },
      }}
      role="main"
      aria-label="Order not found"
    >
      <Container maxWidth="sm">
        <Paper
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            textAlign: 'center',
          }}
          elevation={1}
        >
          <ErrorOutlineIcon
            sx={{
              fontSize: 64,
              color: 'warning.main',
              mb: 2,
            }}
            aria-hidden="true"
          />
          <Typography
            variant="h5"
            component="h1"
            sx={{ mb: 2, fontWeight: 600 }}
          >
            Order Not Found
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            We couldn&apos;t find an order with that ID. Please check the order
            ID and try again.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              If you received an order confirmation email, please check the link
              in that email.
            </Typography>
            <Button
              component={Link}
              href="/"
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
            >
              Return Home
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
