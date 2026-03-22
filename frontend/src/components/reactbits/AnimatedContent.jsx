import React from 'react';
import { motion } from 'framer-motion';

export default function AnimatedContent({
  children,
  delay = 0,
  direction = 'up',
  duration = 0.5,
  className = '',
  stagger = 0,
  style = {},
}) {
  const directions = {
    up: { y: 30, x: 0 },
    down: { y: -30, x: 0 },
    left: { x: 30, y: 0 },
    right: { x: -30, y: 0 },
  };

  const offset = directions[direction] || directions.up;

  return (
    <motion.div
      className={className}
      style={style}
      initial={{
        opacity: 0,
        y: offset.y,
        x: offset.x,
        filter: 'blur(4px)',
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        x: 0,
        filter: 'blur(0px)',
      }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration,
        delay: delay + stagger,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
