import { useState, useRef, useEffect, useCallback } from 'react';
import { StateMachine } from '@/utils/stateMachine';

type TouchState = 'idle' | 'touching' | 'holding' | 'dragging';

interface UsePressAndHoldOptions {
  blockId: string;
  enabled: boolean;
  onHoldStart: (blockId: string) => void;
  onHoldEnd: () => void;
  isDragging: boolean;
  holdDuration?: number;
  movementThreshold?: number;
}

interface UsePressAndHoldResult {
  elementRef: (element: HTMLElement | null) => void;
  isHolding: boolean;
  touchState: TouchState;
}

/**
 * Custom hook for handling press-and-hold touch interactions
 * Manages a state machine for touch states and coordinates with drag-and-drop
 */
export function usePressAndHold({
  blockId,
  enabled,
  onHoldStart,
  onHoldEnd,
  isDragging,
  holdDuration = 120,
  movementThreshold = 5,
}: UsePressAndHoldOptions): UsePressAndHoldResult {
  // React state for rendering (synced with state machine)
  const [touchState, setTouchState] = useState<TouchState>('idle');
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const shouldHandleTouchMoveRef = useRef(true);

  // Store callbacks in refs to avoid accessing refs during render
  const setTouchStateRef = useRef(setTouchState);
  const onHoldStartRef = useRef(onHoldStart);
  const onHoldEndRef = useRef(onHoldEnd);

  // Keep refs updated
  useEffect(() => {
    setTouchStateRef.current = setTouchState;
    onHoldStartRef.current = onHoldStart;
    onHoldEndRef.current = onHoldEnd;
  }, [onHoldStart, onHoldEnd]);

  // Create state machine instance
  const touchStateMachineRef = useRef<StateMachine<TouchState>>(
    new StateMachine<TouchState>({
      initialState: 'idle',
      debugId: `PressAndHold ${blockId}`,
      transitions: [
        { from: 'idle', to: 'touching' },
        { from: 'touching', to: 'holding' },
        { from: 'touching', to: 'idle' },
        { from: 'holding', to: 'dragging' },
        { from: 'holding', to: 'idle' },
        { from: 'dragging', to: 'idle' },
      ],
    })
  );

  // Update state machine callback
  useEffect(() => {
    touchStateMachineRef.current.setOnStateChange((newState, previousState) => {
      // Update React state asynchronously
      setTimeout(() => {
        setTouchStateRef.current(newState);
      }, 0);

      // Handle state-specific side effects
      if (newState === 'holding' && previousState === 'touching') {
        console.log(`[PressAndHold ${blockId}] Calling onHoldStart(${blockId})`);
        onHoldStartRef.current?.(blockId);
        shouldHandleTouchMoveRef.current = false;
      } else if (newState === 'idle' && previousState !== 'idle') {
        if (previousState !== 'dragging') {
          onHoldEndRef.current?.();
        }
        shouldHandleTouchMoveRef.current = true;
      } else if (newState === 'idle' && previousState === 'dragging') {
        onHoldEndRef.current?.();
        shouldHandleTouchMoveRef.current = true;
      }
    });
  }, [blockId]);

  // Get touch state ref
  const getTouchStateRef = useCallback(() => touchStateMachineRef.current.getStateRef(), []);

  // Cleanup state machine on unmount
  useEffect(() => {
    const stateMachine = touchStateMachineRef.current;
    return () => {
      stateMachine?.destroy();
    };
  }, []);

  // Handle touch events using state machine
  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const now = Date.now();
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: now };

      touchStateMachineRef.current?.clearAllTimers();
      touchStateMachineRef.current?.reset();
      shouldHandleTouchMoveRef.current = true;

      touchStateMachineRef.current?.transition('touching');
      // Immediately transition to holding instead of waiting
      touchStateMachineRef.current?.transition('holding');
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!shouldHandleTouchMoveRef.current) {
        // In holding state - let dnd-kit handle it
        return;
      }

      const stateRef = getTouchStateRef();
      const currentState = stateRef.current;
      if (currentState !== 'touching') {
        return;
      }

      if (!touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > movementThreshold) {
        touchStateMachineRef.current?.clearTimer('hold-timer');
        touchStateMachineRef.current?.transition('idle');
        touchStartRef.current = null;
        shouldHandleTouchMoveRef.current = false;
      }
    };

    const handleTouchEnd = () => {
      touchStateMachineRef.current?.clearTimer('hold-timer');

      const stateRef = getTouchStateRef();
      const currentState = stateRef.current;

      if (currentState !== 'dragging') {
        touchStateMachineRef.current?.transition('idle');
      }
      touchStartRef.current = null;
    };

    const handleTouchCancel = () => {
      touchStateMachineRef.current?.clearTimer('hold-timer');

      const stateRef = getTouchStateRef();
      const currentState = stateRef.current;

      if (currentState !== 'dragging') {
        touchStateMachineRef.current?.transition('idle');
      }
      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    const stateMachine = touchStateMachineRef.current;
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
      stateMachine?.clearAllTimers();
    };
  }, [enabled, blockId, holdDuration, movementThreshold, getTouchStateRef]);

  // Sync state machine with dnd-kit drag state
  useEffect(() => {
    const stateRef = getTouchStateRef();
    const currentState = stateRef.current;
    if (isDragging && currentState === 'holding') {
      touchStateMachineRef.current?.clearTimer('hold-timer');
      touchStateMachineRef.current?.transition('dragging');
    } else if (!isDragging && currentState === 'dragging') {
      touchStateMachineRef.current?.transition('idle');
    }
  }, [isDragging, blockId, getTouchStateRef]);

  // Element ref callback
  const elementRefCallback = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  return {
    elementRef: elementRefCallback,
    isHolding: touchState === 'holding',
    touchState,
  };
}

