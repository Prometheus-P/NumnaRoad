'use client';

import React, { useEffect, useState, useRef } from 'react';

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export function BlurText({
  text,
  className = '',
  delay = 0,
  duration = 400, // Reduced from 600 for faster animation
}: BlurTextProps) {
  // Start partially visible for better LCP
  const [isAnimated, setIsAnimated] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Use requestAnimationFrame and cap delay at 150ms
    const raf = requestAnimationFrame(() => {
      const timer = setTimeout(() => setIsAnimated(true), Math.min(delay, 150));
      return () => clearTimeout(timer);
    });
    return () => cancelAnimationFrame(raf);
  }, [delay]);

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        // Start at 0.8 opacity for visible LCP
        opacity: isAnimated ? 1 : 0.8,
        // Reduce blur from 10px to 4px for better mobile performance
        filter: isAnimated ? 'blur(0px)' : 'blur(4px)',
        transform: isAnimated ? 'translateY(0)' : 'translateY(5px)',
        transition: `opacity ${duration}ms ease, filter ${duration}ms ease, transform ${duration}ms ease`,
        willChange: 'opacity, filter, transform',
      }}
    >
      {text}
    </span>
  );
}
