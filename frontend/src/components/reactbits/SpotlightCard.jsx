import React, { useRef, useState } from 'react';
import './SpotlightCard.css';

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(102, 126, 234, 0.15)',
  spotlightSize = 300,
  style = {},
}) {
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={style}
    >
      <div
        className="spotlight-effect"
        style={{
          background: `radial-gradient(${spotlightSize}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />
      <div className="spotlight-content">{children}</div>
    </div>
  );
}
