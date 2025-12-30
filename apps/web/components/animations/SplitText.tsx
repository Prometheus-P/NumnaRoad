'use client';

import React, { useEffect, useState, useRef } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  gradientColors?: string[];
}

export function SplitText({
  text,
  className = '',
  delay = 0,
  staggerDelay = 30, // Reduced from 50 for faster animation
  gradientColors,
}: SplitTextProps) {
  // Start visible for better LCP, then animate
  const [isAnimated, setIsAnimated] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Use requestAnimationFrame for smoother animation start
    const raf = requestAnimationFrame(() => {
      const timer = setTimeout(() => setIsAnimated(true), Math.min(delay, 100)); // Cap delay at 100ms
      return () => clearTimeout(timer);
    });
    return () => cancelAnimationFrame(raf);
  }, [delay]);

  const gradientStyle: React.CSSProperties | undefined = gradientColors
    ? {
        background: `linear-gradient(90deg, ${gradientColors.join(', ')})`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }
    : undefined;

  return (
    <span className={className} style={{ display: 'inline-block' }}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          style={{
            display: 'inline-block',
            // Start at opacity 0.7 for visible LCP, animate to 1
            opacity: isAnimated ? 1 : 0.7,
            transform: isAnimated ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity 0.3s ease, transform 0.3s ease`,
            transitionDelay: `${index * staggerDelay}ms`,
            whiteSpace: char === ' ' ? 'pre' : 'normal',
            ...gradientStyle,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
