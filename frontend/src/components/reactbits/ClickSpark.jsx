import React, { useRef, useCallback } from 'react';
import './ClickSpark.css';

export default function ClickSpark({
  children,
  sparkColor = '#667eea',
  sparkCount = 8,
  sparkSize = 10,
  duration = 500,
  className = '',
}) {
  const containerRef = useRef(null);

  const createSpark = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = 0; i < sparkCount; i++) {
      const spark = document.createElement('div');
      spark.className = 'click-spark';
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.width = `${sparkSize}px`;
      spark.style.height = `${sparkSize}px`;
      spark.style.background = sparkColor;
      spark.style.animationDuration = `${duration}ms`;

      const angle = (360 / sparkCount) * i;
      const distance = 20 + Math.random() * 30;
      spark.style.setProperty('--tx', `${Math.cos((angle * Math.PI) / 180) * distance}px`);
      spark.style.setProperty('--ty', `${Math.sin((angle * Math.PI) / 180) * distance}px`);

      container.appendChild(spark);
      setTimeout(() => spark.remove(), duration);
    }
  }, [sparkColor, sparkCount, sparkSize, duration]);

  return (
    <div
      ref={containerRef}
      className={`click-spark-container ${className}`}
      onClick={createSpark}
    >
      {children}
    </div>
  );
}
