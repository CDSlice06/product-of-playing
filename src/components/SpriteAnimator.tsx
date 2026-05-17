import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { removeWhiteBackground } from '@/utils/imageProcessor';

export type SpriteAnimation = 'idle' | 'breathe' | 'float' | 'shake' | 'pulse' | 'vine-writhing' | 'none';

interface SpriteAnimatorProps {
  src: string;
  frames?: number;
  fps?: number;
  className?: string;
  animation?: SpriteAnimation;
  flipX?: boolean;
  showShadow?: boolean;
  glowColor?: string;
}

export default function SpriteAnimator({
  src,
  className,
  animation = 'breathe',
  flipX = false,
  showShadow = true,
}: SpriteAnimatorProps) {
  const [hasError, setHasError] = useState(false);
  const [displaySrc, setDisplaySrc] = useState(src);

  useEffect(() => {
    let isMounted = true;
    setDisplaySrc(src); // reset immediately when src changes
    removeWhiteBackground(src).then(newSrc => {
      if (isMounted) {
        setDisplaySrc(newSrc);
      }
    });
    return () => { isMounted = false; };
  }, [src]);

  const animationClass = {
    idle: '',
    breathe: 'animate-pixel-breathe',
    float: 'animate-float',
    shake: 'animate-shake',
    pulse: 'animate-pixel-pulse',
    'vine-writhing': 'animate-vine-writhing',
    none: '',
  }[animation];

  return (
    <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
      {showShadow && (
        <div
          className={cn(
            "absolute bottom-[4px] left-1/2 h-[8px] w-[56%] -translate-x-1/2 bg-black/45 opacity-70 transition-all",
            animation === 'breathe' && 'animate-shadow-breathe',
            animation === 'float' && 'animate-shadow-float'
          )}
          style={{ clipPath: 'polygon(8% 50%, 22% 0%, 78% 0%, 92% 50%, 78% 100%, 22% 100%)' }}
        />
      )}

      <img
          src={displaySrc}
          className={cn(
            "w-full h-full object-contain object-bottom pointer-events-none transition-opacity duration-150 origin-bottom",
            animationClass,
            flipX && "-scale-x-100",
            hasError ? "opacity-0" : "opacity-100"
          )}
        onLoad={() => {
          setHasError(false);
        }}
        onError={() => {
          setHasError(true);
        }}
        alt="sprite"
        draggable={false}
      />
      {hasError && (
        <div className="absolute inset-x-1/4 bottom-2 flex h-12 items-end justify-center border-2 border-red-500 bg-red-950/70">
          <div className="mb-1 h-6 w-4 bg-red-400/80" />
        </div>
      )}
    </div>
  );
}
