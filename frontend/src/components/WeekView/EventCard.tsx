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
}

export function EventCard({ block, onClick, compact = false, fillHeight = false, draggable = false }: EventCardProps) {
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
        flex flex-col items-start justify-start
        ${fillHeight ? 'h-full' : ''}
        ${compact ? 'p-2' : 'p-3'}
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
      <div className="pr-4 overflow-hidden w-full">
        <h4
          className={`
            font-medium text-[var(--color-text-primary)] wrap-anywhere
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
