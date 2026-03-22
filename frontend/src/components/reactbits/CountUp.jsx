import { useEffect, useRef, useState } from 'react';

export default function CountUp({
  to = 0,
  from = 0,
  duration = 1.5,
  delay = 0,
  separator = '',
  decimals = 0,
  className = '',
  onComplete,
}) {
  const [value, setValue] = useState(from);
  const startTime = useRef(null);
  const rafId = useRef(null);
  const hasStarted = useRef(false);
  const nodeRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          setTimeout(() => startAnimation(), delay * 1000);
        }
      },
      { threshold: 0.3 }
    );

    if (nodeRef.current) observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, []);

  const startAnimation = () => {
    startTime.current = performance.now();
    const animate = (now) => {
      const elapsed = (now - startTime.current) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = from + (to - from) * eased;
      setValue(current);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        setValue(to);
        onComplete?.();
      }
    };
    rafId.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const formatted = decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toString();

  const display = separator
    ? formatted.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    : formatted;

  return (
    <span ref={nodeRef} className={className}>
      {display}
    </span>
  );
}
