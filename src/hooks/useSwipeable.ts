import { useCallback, useEffect, useRef, useState } from 'react';

interface SwipeableOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefaultTouchmove?: boolean;
}

export const useSwipeable = (options: SwipeableOptions) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefaultTouchmove = false,
  } = options;

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const minSwipeDistance = threshold;

  const onTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null);
    const touch = e.targetTouches[0];
    if (!touch) return;

    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
    });
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (preventDefaultTouchmove) {
        e.preventDefault();
      }
      const touch = e.targetTouches[0];
      if (!touch) return;

      setTouchEnd({
        x: touch.clientX,
        y: touch.clientY,
      });
    },
    [preventDefaultTouchmove]
  );

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
    if (isUpSwipe && onSwipeUp) {
      onSwipeUp();
    }
    if (isDownSwipe && onSwipeDown) {
      onSwipeDown();
    }
  }, [touchStart, touchEnd, minSwipeDistance, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', onTouchStart);
    element.addEventListener('touchmove', onTouchMove);
    element.addEventListener('touchend', onTouchEnd);

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return {
    ref: elementRef,
    touchStart,
    touchEnd,
  };
};
