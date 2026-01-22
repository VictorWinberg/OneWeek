import { useRef, useEffect, useLayoutEffect, useState, useCallback, startTransition, type ReactNode } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import { useWeekEvents } from '@/hooks/useCalendarQueries';
import { getWeekDays } from '@/utils/dateUtils';
import type { Block } from '@/types';

interface WeekData {
  date: Date;
  weekDays: Date[];
  blocks: Block[];
  isLoading: boolean;
}

interface SwipeableWeekContainerProps {
  selectedDate: Date;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  isDisabled?: boolean;
  activeBlock?: Block | null;
  children: (weekData: WeekData) => ReactNode;
  onAllBlocksChange?: (blocks: Block[]) => void;
}

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  isSwiping: boolean;
  velocity: number;
  lastMoveTime: number;
}

const THRESHOLD = 100;
const MIN_HORIZONTAL_MOVEMENT = 10;
const MAX_VERTICAL_MOVEMENT = 50;
const RUBBER_BAND_RESISTANCE = 0.3; // Resistance factor for over-scroll
const MOMENTUM_DECAY = 0.95; // Decay factor for momentum scrolling

export function SwipeableWeekContainer({
  selectedDate,
  onPrevWeek,
  onNextWeek,
  isDisabled = false,
  activeBlock,
  children,
  onAllBlocksChange,
}: SwipeableWeekContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const swipeStateRef = useRef<SwipeState | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const momentumAnimationRef = useRef<number | null>(null);

  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const prevWeekDate = subWeeks(selectedDate, 1);
  const nextWeekDate = addWeeks(selectedDate, 1);

  const { data: currentBlocks = [], isLoading: isCurrentLoading } = useWeekEvents(selectedDate);
  const { data: prevBlocks = [], isLoading: isPrevLoading } = useWeekEvents(prevWeekDate);
  const { data: nextBlocks = [], isLoading: isNextLoading } = useWeekEvents(nextWeekDate);

  const currentWeekDays = getWeekDays(selectedDate);
  const prevWeekDays = getWeekDays(prevWeekDate);
  const nextWeekDays = getWeekDays(nextWeekDate);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    updateWidth();

    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 0) {
            setContainerWidth(width);
          }
        }
      });

      resizeObserver.observe(containerRef.current);
      window.addEventListener('resize', updateWidth);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateWidth);
      };
    }
  }, []);

  const prevBlocksRef = useRef<string>('');
  useEffect(() => {
    if (onAllBlocksChange) {
      const allBlocks = [...prevBlocks, ...currentBlocks, ...nextBlocks];
      const blocksKey = `${prevBlocks.length}-${currentBlocks.length}-${nextBlocks.length}`;
      if (prevBlocksRef.current !== blocksKey) {
        prevBlocksRef.current = blocksKey;
        onAllBlocksChange(allBlocks);
      }
    }
  }, [prevBlocks, currentBlocks, nextBlocks, onAllBlocksChange]);

  // Calculate boundary limits
  const minOffset = -containerWidth * 2; // Can't drag further left than next week
  const maxOffset = 0; // Can't drag further right than current week

  // Apply rubber-band effect to offset
  const applyRubberBand = useCallback((rawOffset: number): number => {
    if (rawOffset >= maxOffset && rawOffset <= minOffset) {
      return rawOffset; // Within bounds
    }

    if (rawOffset > maxOffset) {
      // Over-scrolling right (showing previous week)
      const excess = rawOffset - maxOffset;
      return maxOffset + excess * RUBBER_BAND_RESISTANCE;
    } else {
      // Over-scrolling left (showing next week)
      const excess = minOffset - rawOffset;
      return minOffset - excess * RUBBER_BAND_RESISTANCE;
    }
  }, [minOffset, maxOffset]);

  // Update transform using requestAnimationFrame for smooth rendering
  const updateTransform = useCallback((newOffset: number) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const constrainedOffset = applyRubberBand(newOffset);
      setOffsetX(constrainedOffset);
      animationFrameRef.current = null;
    });
  }, [applyRubberBand]);

  // Handle momentum scrolling
  const handleMomentum = useCallback((initialVelocity: number) => {
    let velocity = initialVelocity;
    let currentOffset = offsetX;

    const animate = () => {
      if (Math.abs(velocity) < 0.5) {
        // Momentum exhausted, snap to nearest week
        const absOffset = Math.abs(currentOffset);
        const baseOffset = -containerWidth;

        if (absOffset >= THRESHOLD) {
          // Threshold met, navigate
          setIsAnimating(true);
          if (currentOffset > 0 && onPrevWeek) {
            onPrevWeek();
          } else if (currentOffset < 0 && onNextWeek) {
            onNextWeek();
          }
        } else {
          // Threshold not met, return to center
          setIsAnimating(true);
          updateTransform(baseOffset);
          setTimeout(() => {
            setIsAnimating(false);
            setOffsetX(0);
          }, 300);
        }
        return;
      }

      currentOffset += velocity;
      velocity *= MOMENTUM_DECAY;
      updateTransform(currentOffset);

      momentumAnimationRef.current = requestAnimationFrame(animate);
    };

    momentumAnimationRef.current = requestAnimationFrame(animate);
  }, [offsetX, containerWidth, onPrevWeek, onNextWeek, updateTransform]);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isDisabled || (!onPrevWeek && !onNextWeek)) return;

      // Cancel any ongoing momentum animation
      if (momentumAnimationRef.current) {
        cancelAnimationFrame(momentumAnimationRef.current);
        momentumAnimationRef.current = null;
      }

      const touch = e.touches[0];
      swipeStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        isSwiping: false,
        velocity: 0,
        lastMoveTime: Date.now(),
      };
      setIsDragging(false);
      setIsAnimating(false);
    },
    [onPrevWeek, onNextWeek, isDisabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeStateRef.current) return;

      const touch = e.touches[0];
      const now = Date.now();
      const deltaX = touch.clientX - swipeStateRef.current.startX;
      const deltaY = Math.abs(touch.clientY - swipeStateRef.current.startY);
      const absDeltaX = Math.abs(deltaX);
      const timeDelta = now - swipeStateRef.current.lastMoveTime;

      // Check if this is a horizontal swipe
      if (!swipeStateRef.current.isSwiping) {
        if (absDeltaX < MIN_HORIZONTAL_MOVEMENT) return;

        if (deltaY > MAX_VERTICAL_MOVEMENT) {
          swipeStateRef.current = null;
          return;
        }

        swipeStateRef.current.isSwiping = true;
        setIsDragging(true);
      }

      // Prevent default scrolling during horizontal swipe
      if (swipeStateRef.current.isSwiping && absDeltaX > MIN_HORIZONTAL_MOVEMENT) {
        e.preventDefault();
      }

      // Calculate velocity (pixels per millisecond)
      if (timeDelta > 0) {
        const moveDelta = touch.clientX - swipeStateRef.current.currentX;
        swipeStateRef.current.velocity = moveDelta / timeDelta;
      }

      swipeStateRef.current.currentX = touch.clientX;
      swipeStateRef.current.lastMoveTime = now;

      // Update transform smoothly
      const baseOffset = -containerWidth;
      const newOffset = baseOffset + deltaX;
      updateTransform(newOffset);
    },
    [containerWidth, updateTransform]
  );

  const handleTouchEnd = useCallback(() => {
    if (!swipeStateRef.current || !swipeStateRef.current.isSwiping) {
      swipeStateRef.current = null;
      return;
    }

    const deltaX = swipeStateRef.current.currentX - swipeStateRef.current.startX;
    const absDeltaX = Math.abs(deltaX);
    const velocity = swipeStateRef.current.velocity * 16; // Convert to pixels per frame (assuming 60fps)

    setIsDragging(false);

    // If there's significant velocity, use momentum scrolling
    if (Math.abs(velocity) > 2) {
      handleMomentum(velocity);
    } else {
      // No momentum, check threshold
      if (absDeltaX >= THRESHOLD) {
        setIsAnimating(true);
        if (deltaX > 0 && onPrevWeek) {
          onPrevWeek();
        } else if (deltaX < 0 && onNextWeek) {
          onNextWeek();
        }
        setTimeout(() => {
          setIsAnimating(false);
          setOffsetX(0);
        }, 300);
      } else {
        // Threshold not met, snap back
        setIsAnimating(true);
        const baseOffset = -containerWidth;
        updateTransform(baseOffset);
        setTimeout(() => {
          setIsAnimating(false);
          setOffsetX(0);
        }, 300);
      }
    }

    swipeStateRef.current = null;
  }, [containerWidth, onPrevWeek, onNextWeek, handleMomentum, updateTransform]);

  // Combine refs
  const combinedRef = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;
      swipeContainerRef.current = element;
    },
    []
  );

  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  const dateChanged = prevSelectedDate.getTime() !== selectedDate.getTime();

  // Reset swipe state when selectedDate changes
  useLayoutEffect(() => {
    if (dateChanged) {
      // Cancel any ongoing animations
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (momentumAnimationRef.current) {
        cancelAnimationFrame(momentumAnimationRef.current);
        momentumAnimationRef.current = null;
      }
      // Use startTransition to avoid cascading renders
      startTransition(() => {
        setOffsetX(0);
        setIsDragging(false);
        setIsAnimating(false);
      });
    }
  }, [selectedDate, dateChanged]);

  useEffect(() => {
    if (dateChanged) {
      startTransition(() => {
        setPrevSelectedDate(selectedDate);
      });
    }
  }, [selectedDate, dateChanged]);

  useEffect(() => {
    if (dateChanged) {
      startTransition(() => {
        setPrevSelectedDate(selectedDate);
      });
    }
  }, [selectedDate, dateChanged]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (momentumAnimationRef.current) {
        cancelAnimationFrame(momentumAnimationRef.current);
      }
    };
  }, []);

  // Calculate transform offset
  const baseOffset = -containerWidth;
  const effectiveOffsetX = dateChanged && !isDragging && !isAnimating ? 0 : offsetX;
  const transformX = baseOffset + effectiveOffsetX;
  const prevWeekData: WeekData = {
    date: prevWeekDate,
    weekDays: prevWeekDays,
    blocks: prevBlocks,
    isLoading: isPrevLoading,
  };

  const currentWeekData: WeekData = {
    date: selectedDate,
    weekDays: currentWeekDays,
    blocks: currentBlocks,
    isLoading: isCurrentLoading,
  };

  const nextWeekData: WeekData = {
    date: nextWeekDate,
    weekDays: nextWeekDays,
    blocks: nextBlocks,
    isLoading: isNextLoading,
  };

  return (
    <div
      ref={combinedRef}
      className="flex-1 overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: isDragging ? 'none' : 'pan-y',
        userSelect: isDragging ? 'none' : 'auto',
        WebkitUserSelect: isDragging ? 'none' : 'auto',
      }}
    >
      <div
        className="flex h-full"
        style={{
          width: `${containerWidth * 3}px`,
          transform: `translate3d(${transformX}px, 0, 0)`,
          transition: isAnimating ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          willChange: isDragging ? 'transform' : 'auto',
        }}
      >
        {/* Previous Week */}
        <div
          className="h-full overflow-hidden flex flex-col"
          style={{
            width: `${containerWidth}px`,
            flexShrink: 0,
          }}
        >
          {children(prevWeekData)}
        </div>

        {/* Current Week */}
        <div
          className="h-full overflow-hidden flex flex-col"
          style={{
            width: `${containerWidth}px`,
            flexShrink: 0,
          }}
        >
          {children(currentWeekData)}
        </div>

        {/* Next Week */}
        <div
          className="h-full overflow-hidden flex flex-col"
          style={{
            width: `${containerWidth}px`,
            flexShrink: 0,
          }}
        >
          {children(nextWeekData)}
        </div>
      </div>
    </div>
  );
}
