/**
 * SkipLink Component
 *
 * Provides keyboard users a way to skip directly to main content.
 * WCAG 2.4.1: Bypass Blocks
 *
 * The link is visually hidden until focused, then appears at the top of the page.
 */

'use client';

import { Box, Link } from '@mui/material';
import { styled } from '@mui/material/styles';

const SkipLinkStyled = styled(Link)(({ theme }) => ({
  position: 'absolute',
  top: '-100px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: theme.spacing(1.5, 3),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontWeight: 600,
  fontSize: '0.875rem',
  textDecoration: 'none',
  borderRadius: theme.shape.borderRadius,
  zIndex: theme.zIndex.tooltip + 1,
  transition: 'top 0.2s ease-in-out',
  boxShadow: theme.shadows[4],

  '&:focus': {
    top: theme.spacing(2),
    outline: `3px solid ${theme.palette.primary.dark}`,
    outlineOffset: '2px',
  },

  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    textDecoration: 'none',
  },

  // Respect reduced motion preference
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

interface SkipLinkProps {
  /**
   * The ID of the main content element to skip to.
   * @default "main-content"
   */
  mainContentId?: string;

  /**
   * The text to display in the skip link.
   * @default "본문으로 건너뛰기"
   */
  label?: string;
}

export function SkipLink({
  mainContentId = 'main-content',
  label = '본문으로 건너뛰기',
}: SkipLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    const mainContent = document.getElementById(mainContentId);

    if (mainContent) {
      // Set tabindex temporarily to make the element focusable
      if (!mainContent.hasAttribute('tabindex')) {
        mainContent.setAttribute('tabindex', '-1');
      }

      // Focus the main content
      mainContent.focus();

      // Scroll to the main content
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Box component="nav" aria-label="빠른 탐색">
      <SkipLinkStyled href={`#${mainContentId}`} onClick={handleClick}>
        {label}
      </SkipLinkStyled>
    </Box>
  );
}

/**
 * MainContent Wrapper Component
 *
 * Use this component to wrap your main content area.
 * Provides the target for the SkipLink component.
 */
interface MainContentProps {
  children: React.ReactNode;
  id?: string;
}

export function MainContent({ children, id = 'main-content' }: MainContentProps) {
  return (
    <Box
      component="main"
      id={id}
      role="main"
      aria-label="메인 콘텐츠"
      sx={{
        outline: 'none',
        '&:focus': {
          outline: 'none',
        },
      }}
    >
      {children}
    </Box>
  );
}
