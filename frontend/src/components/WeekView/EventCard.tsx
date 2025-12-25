import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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

  // Setup draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${block.calendarId}-${block.id}`,
    disabled: !draggable || !person,
  });

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
    onClick();
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
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
                ? 'text-[8px] leading-tight break-words'
                : compact
                ? 'text-[11px] leading-tight break-words'
                : 'text-sm break-words'
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
