import React, { useRef, useState } from 'react';
import './TiltCard.css';

export default function TiltCard({
  children,
  className = '',
  maxTilt = 10,
  scale = 1.02,
  perspective = 1000,
  style = {},
}) {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState('');

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    setTransform(
      `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`
    );
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  return (
    <div
      ref={cardRef}
      className={`tilt-card ${className}`}
      style={{ transform, ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
