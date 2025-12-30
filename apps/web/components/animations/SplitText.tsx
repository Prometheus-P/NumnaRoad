'use client';

import React, { useEffect, useState } from 'react';

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
  staggerDelay = 50,
  gradientColors,
}: SplitTextProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
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
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: `opacity 0.4s ease, transform 0.4s ease`,
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
