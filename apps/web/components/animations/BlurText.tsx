'use client';

import React, { useEffect, useState } from 'react';

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
  duration = 600,
}: BlurTextProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? 'blur(0px)' : 'blur(10px)',
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity ${duration}ms ease, filter ${duration}ms ease, transform ${duration}ms ease`,
      }}
    >
      {text}
    </span>
  );
}
