import React from 'react';
import './GradientText.css';

export default function GradientText({
  children,
  className = '',
  colors = ['#667eea', '#764ba2', '#f093fb', '#667eea'],
  animationSpeed = 4,
  style = {},
}) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
    backgroundSize: `${colors.length * 100}% 100%`,
    animationDuration: `${animationSpeed}s`,
    ...style,
  };

  return (
    <span className={`gradient-text-animated ${className}`} style={gradientStyle}>
      {children}
    </span>
  );
}
