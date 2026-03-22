import React from 'react';
import { motion } from 'framer-motion';

export default function SplitText({
  text = '',
  className = '',
  delay = 0.05,
  duration = 0.5,
  staggerFrom = 'first',
  as: Tag = 'span',
  style = {},
}) {
  const words = text.split(' ');

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: {
        staggerChildren: delay,
        delayChildren: 0.1,
        staggerDirection: staggerFrom === 'last' ? -1 : 1,
      },
    }),
  };

  const child = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: 'blur(4px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
        duration,
      },
    },
  };

  return (
    <motion.span
      className={className}
      style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.3em', ...style }}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span key={index} variants={child} style={{ display: 'inline-block' }}>
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}
