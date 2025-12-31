/**
 * Accessibility Utilities for NumnaRoad
 *
 * WCAG 2.2 AA compliant accessibility hooks and components.
 */

'use client';

import { useEffect, useState, useCallback, useRef, RefObject } from 'react';

// =============================================================================
// useReducedMotion Hook
// =============================================================================

/**
 * Detects if the user prefers reduced motion.
 * Respects the `prefers-reduced-motion` media query.
 *
 * @example
 * const prefersReduced = useReducedMotion();
 * const animationDuration = prefersReduced ? 0 : 300;
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReduced;
}

// =============================================================================
// useAnnounce Hook (aria-live regions)
// =============================================================================

/**
 * Creates an announcer for screen readers using aria-live regions.
 * Messages are announced to assistive technologies without visual display.
 *
 * @example
 * const announce = useAnnounce();
 * announce('검색 결과 10개를 찾았습니다.');
 * announce('오류가 발생했습니다.', 'assertive');
 */
export function useAnnounce(): (
  message: string,
  priority?: 'polite' | 'assertive'
) => void {
  const politeRef = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create aria-live regions if they don't exist
    if (typeof document === 'undefined') return;

    const createLiveRegion = (id: string, politeness: string): HTMLDivElement => {
      let region = document.getElementById(id) as HTMLDivElement | null;

      if (!region) {
        region = document.createElement('div');
        region.id = id;
        region.setAttribute('aria-live', politeness);
        region.setAttribute('aria-atomic', 'true');
        region.setAttribute('role', 'status');
        // Visually hidden but accessible
        region.style.cssText = `
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        `;
        document.body.appendChild(region);
      }

      return region;
    };

    politeRef.current = createLiveRegion('a11y-announcer-polite', 'polite');
    assertiveRef.current = createLiveRegion('a11y-announcer-assertive', 'assertive');

    return () => {
      // Clean up on unmount (only if we created them)
      politeRef.current?.remove();
      assertiveRef.current?.remove();
    };
  }, []);

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const region = priority === 'assertive' ? assertiveRef.current : politeRef.current;

      if (region) {
        // Clear and set to trigger announcement
        region.textContent = '';
        // Use requestAnimationFrame to ensure the clear is processed
        requestAnimationFrame(() => {
          region.textContent = message;
        });
      }
    },
    []
  );

  return announce;
}

// =============================================================================
// useFocusTrap Hook
// =============================================================================

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Traps focus within a container element.
 * Useful for modals, dialogs, and drawers.
 *
 * @param containerRef - Reference to the container element
 * @param isActive - Whether the focus trap is active
 * @param options - Additional options
 *
 * @example
 * const dialogRef = useRef<HTMLDivElement>(null);
 * useFocusTrap(dialogRef, isOpen);
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  options: {
    initialFocusRef?: RefObject<HTMLElement | null>;
    returnFocusOnDeactivate?: boolean;
  } = {}
): void {
  const { initialFocusRef, returnFocusOnDeactivate = true } = options;
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the initial element or first focusable element
    const setInitialFocus = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    };

    // Use setTimeout to ensure the container is rendered
    const timeoutId = setTimeout(setInitialFocus, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab on first element → go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // Tab on last element → go to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      container.removeEventListener('keydown', handleKeyDown);

      // Return focus to the previously focused element
      if (returnFocusOnDeactivate && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, containerRef, initialFocusRef, returnFocusOnDeactivate]);
}

// =============================================================================
// useId Hook (for ARIA relationships)
// =============================================================================

let idCounter = 0;

/**
 * Generates a unique ID for ARIA relationships.
 * Useful for aria-labelledby, aria-describedby, etc.
 *
 * @param prefix - Optional prefix for the ID
 *
 * @example
 * const id = useId('input');
 * // Returns: "input-1", "input-2", etc.
 */
export function useA11yId(prefix = 'a11y'): string {
  const [id] = useState(() => `${prefix}-${++idCounter}`);
  return id;
}

// =============================================================================
// Keyboard Navigation Utilities
// =============================================================================

/**
 * Key codes for keyboard navigation
 */
export const Keys = {
  Enter: 'Enter',
  Space: ' ',
  Escape: 'Escape',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Home: 'Home',
  End: 'End',
  Tab: 'Tab',
} as const;

/**
 * Handles arrow key navigation for roving tabindex pattern.
 * Use with lists, menus, and toolbars.
 *
 * @example
 * const handleKeyDown = useRovingTabIndex(items, currentIndex, setCurrentIndex);
 */
export function useRovingTabIndex(
  items: HTMLElement[] | NodeListOf<HTMLElement>,
  currentIndex: number,
  setCurrentIndex: (index: number) => void,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
  } = {}
): (event: React.KeyboardEvent) => void {
  const { orientation = 'vertical', loop = true } = options;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const itemsArray = Array.from(items);
      const length = itemsArray.length;

      let newIndex = currentIndex;

      const isVertical = orientation === 'vertical' || orientation === 'both';
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';

      switch (event.key) {
        case Keys.ArrowUp:
          if (isVertical) {
            event.preventDefault();
            newIndex = loop
              ? (currentIndex - 1 + length) % length
              : Math.max(0, currentIndex - 1);
          }
          break;
        case Keys.ArrowDown:
          if (isVertical) {
            event.preventDefault();
            newIndex = loop ? (currentIndex + 1) % length : Math.min(length - 1, currentIndex + 1);
          }
          break;
        case Keys.ArrowLeft:
          if (isHorizontal) {
            event.preventDefault();
            newIndex = loop
              ? (currentIndex - 1 + length) % length
              : Math.max(0, currentIndex - 1);
          }
          break;
        case Keys.ArrowRight:
          if (isHorizontal) {
            event.preventDefault();
            newIndex = loop ? (currentIndex + 1) % length : Math.min(length - 1, currentIndex + 1);
          }
          break;
        case Keys.Home:
          event.preventDefault();
          newIndex = 0;
          break;
        case Keys.End:
          event.preventDefault();
          newIndex = length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        itemsArray[newIndex]?.focus();
      }
    },
    [items, currentIndex, setCurrentIndex, orientation, loop]
  );

  return handleKeyDown;
}

// =============================================================================
// Visibility Utilities
// =============================================================================

/**
 * Styles for visually hidden elements that remain accessible to screen readers.
 * Use for skip links, labels, and other accessibility enhancements.
 */
export const visuallyHiddenStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * CSS class name for visually hidden content.
 * Add this to your global styles:
 *
 * .visually-hidden {
 *   position: absolute;
 *   width: 1px;
 *   height: 1px;
 *   padding: 0;
 *   margin: -1px;
 *   overflow: hidden;
 *   clip: rect(0, 0, 0, 0);
 *   white-space: nowrap;
 *   border: 0;
 * }
 */
export const VISUALLY_HIDDEN_CLASS = 'visually-hidden';
