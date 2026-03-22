import React, { useRef, useState } from 'react';

export default function Magnet({
  children,
  strength = 0.3,
  className = '',
  style = {},
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    setPos({ x, y });
  };

  const handleMouseLeave = () => {
    setPos({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'inline-block',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: pos.x === 0 ? 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'transform 0.1s ease-out',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
