import React, { useEffect, useRef } from 'react';

interface AmbientBackgroundProps {
  fx: boolean;
  motion: number;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ fx, motion }) => {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    let raf: number | null = null;
    let mx = 0;
    let my = 0;

    const handlePointerMove = (e: PointerEvent) => {
      if (!fx || motion === 0) return;
      mx = e.clientX;
      my = e.clientY;
      glow.style.opacity = '1';

      if (!raf) {
        raf = requestAnimationFrame(() => {
          glow.style.left = `${mx}px`;
          glow.style.top = `${my}px`;
          raf = null;
        });
      }
    };

    const handlePointerLeave = () => {
      glow.style.opacity = '0';
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [fx, motion]);

  return (
    <>
      <div id="ambient" aria-hidden="true">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      <div id="mouse-glow" ref={glowRef} aria-hidden="true"></div>
    </>
  );
};
