/**
 * Custom hook for drag and drop functionality
 * Encapsulates drag state management and event handling
 */

import { useState, useCallback } from 'react';
import { useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Block } from '@/types';
import { findBlockById } from '@/services/calendarNormalizer';
import { handleDragDrop, type EventMutations, type FullDropData } from '@/utils/dragAndDrop';

export interface UseDragAndDropOptions {
  blocks: Block[];
  mutations: EventMutations;
  isMobile?: boolean;
}

export interface UseDragAndDropResult {
  activeBlock: Block | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  sensors: ReturnType<typeof useSensors>;
}

/**
 * Custom hook for managing drag and drop state and handlers
 */
export function useDragAndDrop({
  blocks,
  mutations,
  isMobile = false,
}: UseDragAndDropOptions): UseDragAndDropResult {
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  // Configure sensors based on device type
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isMobile ? 3 : 8,
      },
    }),
    ...(isMobile
      ? [
          useSensor(TouchSensor, {
            activationConstraint: {
              delay: 150,
              tolerance: 5,
            },
          }),
        ]
      : [])
  );

  /**
   * Handle drag start - find and set the active block
   */
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const blockId = String(event.active.id);
      const block = findBlockById(blocks, blockId);
      if (block) {
        setActiveBlock(block);
      }
    },
    [blocks]
  );

  /**
   * Handle drag end - process the drop and update event times
   */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveBlock(null);

      if (!event.over) return;

      const blockId = String(event.active.id);
      const dropData = event.over.data.current as FullDropData | undefined;

      if (!dropData) return;

      const block = findBlockById(blocks, blockId);
      if (!block) return;

      await handleDragDrop(block, dropData, mutations);
    },
    [blocks, mutations]
  );

  return {
    activeBlock,
    handleDragStart,
    handleDragEnd,
    sensors,
  };
}

/**
 * Simplified hook for desktop-only drag and drop
 */
export function useDesktopDragAndDrop(
  blocks: Block[],
  mutations: EventMutations
): UseDragAndDropResult {
  return useDragAndDrop({ blocks, mutations, isMobile: false });
}

/**
 * Simplified hook for mobile drag and drop
 */
export function useMobileDragAndDrop(
  blocks: Block[],
  mutations: EventMutations
): UseDragAndDropResult {
  return useDragAndDrop({ blocks, mutations, isMobile: true });
}

