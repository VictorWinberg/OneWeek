import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { Block } from '@/types';
import { getInitial } from '@/types';
import { useConfigStore } from '@/stores/configStore';
import { formatBlockTime, isBlockPast, isBlockCurrent } from '@/services/calendarNormalizer';

interface EventCardProps {
  block: Block;
  onClick: () => void;
  compact?: boolean;
  fillHeight?: boolean;
  draggable?: boolean;
}

// Constants for press-and-hold interaction
const PRESS_HOLD_DELAY = 300; // ms to hold before activating drag mode
const VIBRATION_DURATION = 50; // ms of haptic feedback

export function EventCard({ block, onClick, compact = false, fillHeight = false, draggable = false }: EventCardProps) {
  const { getPersonById } = useConfigStore();
  const person = getPersonById(block.calendarId);
  const isPast = isBlockPast(block);
  const isCurrent = isBlockCurrent(block);

  // State for press-and-hold interaction
  const [isDragMode, setIsDragMode] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);

  // Setup draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${block.calendarId}-${block.id}`,
    disabled: !draggable || !person || !isDragMode,
  });

  // Track dragging state
  useEffect(() => {
    if (isDragging) {
      isDraggingRef.current = true;
    } else if (isDraggingRef.current) {
      // Reset drag mode after dragging ends
      isDraggingRef.current = false;
      setIsDragMode(false);
    }
  }, [isDragging]);

  // Trigger haptic feedback
  const triggerVibration = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(VIBRATION_DURATION);
    }
  }, []);

  // Handle press start (touch or mouse)
  const handlePressStart = useCallback(() => {
    if (!draggable || !person) return;

    pressTimerRef.current = setTimeout(() => {
      setIsDragMode(true);
      triggerVibration();
    }, PRESS_HOLD_DELAY);
  }, [draggable, person, triggerVibration]);

  // Handle press end
  const handlePressEnd = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: person ? `color-mix(in srgb, ${person.color} 25%, var(--color-bg-secondary))` : 'transparent',
    borderLeft: person ? `4px solid ${person.color}` : 'none',
  };

  if (!person) {
    return null; // Don't render if person/calendar not found
  }

  const initial = getInitial(person.name);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    // Only trigger onClick if we're not in drag mode or currently dragging
    if (!isDragMode || isDragging) return;
    onClick();
  };

  // Custom touch handlers for press-and-hold
  const handleTouchStart = (e: React.TouchEvent) => {
    handlePressStart();
    // Don't prevent default to allow native scrolling when not in drag mode
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    handlePressEnd();
    // If we're not in drag mode, allow the click to propagate
    if (!isDragMode && !isDraggingRef.current) {
      handleClick(e as any);
    }
  };

  const handleTouchCancel = () => {
    handlePressEnd();
    setIsDragMode(false);
  };

  // Mouse handlers for desktop
  const handleMouseDown = () => {
    handlePressStart();
  };

  const handleMouseUp = () => {
    handlePressEnd();
  };

  const handleMouseLeave = () => {
    handlePressEnd();
    if (!isDragging) {
      setIsDragMode(false);
    }
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      onTouchStart={draggable ? handleTouchStart : undefined}
      onTouchEnd={draggable ? handleTouchEnd : undefined}
      onTouchCancel={draggable ? handleTouchCancel : undefined}
      onMouseDown={draggable ? handleMouseDown : undefined}
      onMouseUp={draggable ? handleMouseUp : undefined}
      onMouseLeave={draggable ? handleMouseLeave : undefined}
      {...(isDragMode ? { ...listeners, ...attributes } : {})}
      className={`
        group relative w-full text-left rounded-lg transition-all duration-200
        flex flex-col items-start justify-start
        ${fillHeight ? 'h-full' : ''}
        ${compact ? 'p-2' : 'p-3'}
        ${isPast ? 'opacity-60' : ''}
        ${isCurrent ? 'ring-2 ring-white/30 shadow-lg' : ''}
        ${draggable ? 'cursor-grab select-none' : ''}
        ${isDragMode && !isDragging ? 'scale-105 shadow-xl ring-2 ring-white/50' : ''}
        ${isDragging ? 'cursor-grabbing' : ''}
        ${!isDragging && !isDragMode ? 'hover:scale-[1.02] hover:shadow-lg' : ''}
        focus:outline-none focus:ring-2 focus:ring-white/50
      `}
    >
      {/* Avatar */}
      <div
        className={`
          absolute -top-2 -right-2 rounded-full flex items-center justify-center
          font-bold text-xs shadow-md
          ${compact ? 'w-5 h-5' : 'w-6 h-6'}
        `}
        style={{
          backgroundColor: person.color,
          color: 'var(--color-bg-primary)',
        }}
      >
        {initial.charAt(0)}
      </div>

      {/* Content */}
      <div className="pr-4">
        <h4
          className={`
            font-medium text-[var(--color-text-primary)] break-words
            ${compact ? 'text-xs' : 'text-sm'}
          `}
        >
          {block.title}
        </h4>

        <p className={`text-[var(--color-text-secondary)] mt-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {formatBlockTime(block)}
        </p>
      </div>

      {/* Current indicator */}
      {isCurrent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-accent)] rounded-l-lg animate-pulse" />
      )}
    </button>
  );
}
