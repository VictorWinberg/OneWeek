import { useDraggable } from '@dnd-kit/core';
import { useRef } from 'react';
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
  isAllDay?: boolean;
  hideTime?: boolean;
  extraCompact?: boolean;
  truncate?: boolean;
}

export function EventCard({
  block,
  onClick,
  compact = false,
  fillHeight = false,
  draggable = false,
  isAllDay = false,
  hideTime = false,
  extraCompact = false,
  truncate = false,
}: EventCardProps) {
  const { getPersonById } = useConfigStore();
  const person = getPersonById(block.calendarId);
  const isPast = isBlockPast(block);
  const isCurrent = isBlockCurrent(block);

  // Track touch state to detect fast swipes
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
  } | null>(null);

  // Setup draggable
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${block.calendarId}-${block.id}`,
    disabled: !draggable || !person,
  });

  const style = {
    // Don't apply transform - DragOverlay handles the dragged element position
    opacity: isDragging ? 0.3 : 1,
    backgroundColor: person ? `color-mix(in srgb, ${person.color} 25%, var(--color-bg-secondary))` : 'transparent',
    borderLeft: person ? `4px solid ${person.color}` : 'none',
    touchAction: draggable ? 'none' : 'auto',
  } as React.CSSProperties;

  if (!person) {
    return null; // Don't render if person/calendar not found
  }

  const initial = getInitial(person.name);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    onClick();
  };

  // Handle touch events to detect fast swipes and prevent drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!draggable) return;
    const touch = e.touches[0];
    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggable || !touchStateRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStateRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchStateRef.current.startY);
    const elapsedTime = Date.now() - touchStateRef.current.startTime;

    // Check if this is a fast horizontal swipe (high velocity and significant horizontal movement)
    // Fast swipe threshold: velocity >= 0.5 px/ms and horizontal movement >= 20px, or very significant horizontal movement
    const velocity = elapsedTime > 0 ? deltaX / elapsedTime : 0;
    const isFastSwipe =
      (velocity >= 0.5 && deltaX >= 20 && deltaX > deltaY * 2) ||
      (deltaX >= 40 && deltaX > deltaY * 2); // Very significant horizontal movement

    // If it's a fast swipe, prevent the drag from starting
    if (isFastSwipe) {
      e.preventDefault();
      e.stopPropagation();
      // Clear touch state to prevent drag
      touchStateRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current = null;
  };

  return (
    <button
      ref={setNodeRef}
      data-event-card
      style={style}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      className={`
        group relative w-full text-left rounded-lg transition-all duration-200
        flex flex-col items-start justify-start select-none
        ${fillHeight ? 'h-full' : ''}
        ${extraCompact || (compact && isAllDay) ? 'p-0.5 py-0.5' : compact ? 'p-1.5' : 'p-3'}
        ${isPast ? 'opacity-60' : ''}
        ${isCurrent ? 'ring-2 ring-white/30 shadow-lg' : ''}
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
        ${!isDragging ? 'hover:scale-[1.02] hover:shadow-lg' : ''}
        focus:outline-none focus:ring-2 focus:ring-white/50
      `}
    >
      {/* Avatar */}
      <div
        className={`
          absolute -top-1 -right-1 rounded-full flex items-center justify-center
          font-bold shadow-md
          ${compact && isAllDay ? 'w-3 h-3 text-[6px]' : compact ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-xs'}
        `}
        style={{
          backgroundColor: person.color,
          color: 'var(--color-bg-primary)',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {initial.charAt(0)}
      </div>

      {/* Content */}
      <div className="pr-3 overflow-hidden w-full">
        <h4
          className={`
            font-medium text-[var(--color-text-primary)]
            ${
              truncate
                ? 'text-[8px] leading-tight whitespace-nowrap overflow-hidden text-ellipsis'
                : compact && isAllDay
                ? 'text-[8px] leading-tight wrap-anywhere'
                : compact
                ? 'text-[11px] leading-tight wrap-anywhere'
                : 'text-sm wrap-anywhere'
            }
          `}
          style={{
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {block.title}
        </h4>

        {!isAllDay && !hideTime && (
          <p
            className={`mt-0.5 text-[var(--color-text-secondary)] ${compact ? 'text-[9px] leading-tight' : 'text-xs'}`}
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {formatBlockTime(block)}
          </p>
        )}
      </div>

      {/* Current indicator */}
      {isCurrent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-accent)] rounded-l-lg animate-pulse" />
      )}
    </button>
  );
}
