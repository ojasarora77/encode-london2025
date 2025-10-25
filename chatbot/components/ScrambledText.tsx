import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

export interface ScrambledTextProps {
  radius?: number;
  duration?: number;
  speed?: number;
  scrambleChars?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  trigger?: 'hover' | 'pointermove' | 'auto';
  autoInterval?: number;
}

const ScrambledText: React.FC<ScrambledTextProps> = ({
  radius = 100,
  duration = 1.2,
  speed = 0.5,
  scrambleChars = '.:',
  className = '',
  style = {},
  children,
  trigger = 'pointermove',
  autoInterval = 5000
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const split = SplitText.create(rootRef.current.querySelector('p'), {
      type: 'chars',
      charsClass: 'inline-block will-change-transform'
    });

    split.chars.forEach(el => {
      const c = el as HTMLElement;
      gsap.set(c, { attr: { 'data-content': c.innerHTML } });
    });

    const scrambleAllChars = () => {
      split.chars.forEach((el, index) => {
        const c = el as HTMLElement;
        gsap.to(c, {
          overwrite: true,
          duration,
          delay: index * 0.03,
          scrambleText: {
            text: c.dataset.content || '',
            chars: scrambleChars,
            speed
          },
          ease: 'none'
        });
      });
    };

    const handleMove = (e: PointerEvent) => {
      split.chars.forEach(el => {
        const c = el as HTMLElement;
        const { left, top, width, height } = c.getBoundingClientRect();
        const dx = e.clientX - (left + width / 2);
        const dy = e.clientY - (top + height / 2);
        const dist = Math.hypot(dx, dy);

        if (dist < radius) {
          gsap.to(c, {
            overwrite: true,
            duration: duration * (1 - dist / radius),
            scrambleText: {
              text: c.dataset.content || '',
              chars: scrambleChars,
              speed
            },
            ease: 'none'
          });
        }
      });
    };

    const el = rootRef.current;
    let intervalId: NodeJS.Timeout | null = null;

    if (trigger === 'hover') {
      el.addEventListener('mouseenter', scrambleAllChars);
    } else if (trigger === 'pointermove') {
      el.addEventListener('pointermove', handleMove);
    } else if (trigger === 'auto') {
      intervalId = setInterval(scrambleAllChars, autoInterval);
    }

    return () => {
      el.removeEventListener('mouseenter', scrambleAllChars);
      el.removeEventListener('pointermove', handleMove);
      if (intervalId) clearInterval(intervalId);
      split.revert();
    };
  }, [radius, duration, speed, scrambleChars, trigger, autoInterval]);

  return (
    <div
      ref={rootRef}
      className={`max-w-[800px] text-[clamp(14px,4vw,32px)] text-white ${className}`}
      style={style}
    >
      <p>{children}</p>
    </div>
  );
};

export default ScrambledText;
