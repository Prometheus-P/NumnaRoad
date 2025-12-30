'use client';

import React, { useEffect } from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
}

export function GradientText({
  children,
  className = '',
  colors = ['#6366F1', '#EC4899', '#6366F1'],
  animationSpeed = 3,
}: GradientTextProps) {
  useEffect(() => {
    // Inject keyframes if not already present
    const styleId = 'gradient-text-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes gradientShift {
          0% { background-position: 0% center; }
          50% { background-position: 100% center; }
          100% { background-position: 0% center; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const gradientStyle: React.CSSProperties = {
    background: `linear-gradient(90deg, ${colors.join(', ')})`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: `gradientShift ${animationSpeed}s ease infinite`,
    display: 'inline-block',
  };

  return (
    <span className={className} style={gradientStyle}>
      {children}
    </span>
  );
}
