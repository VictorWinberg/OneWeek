/**
 * Generic state machine implementation for managing component state transitions
 * Supports synchronous state access, delayed transitions, and state change callbacks
 */

export type StateTransition<T> = {
  from: T;
  to: T;
  condition?: () => boolean;
};

export interface StateMachineConfig<T extends string> {
  initialState: T;
  transitions?: StateTransition<T>[];
  onStateChange?: (newState: T, previousState: T) => void;
  debugId?: string;
}

export class StateMachine<T extends string> {
  private currentState: T;
  private stateRef: { current: T };
  private config: StateMachineConfig<T>;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(config: StateMachineConfig<T>) {
    this.currentState = config.initialState;
    this.stateRef = { current: config.initialState };
    this.config = config;
  }

  /**
   * Get the current state synchronously
   */
  getState(): T {
    return this.currentState;
  }

  /**
   * Get a ref to the current state for synchronous access
   */
  getStateRef(): { current: T } {
    return this.stateRef;
  }

  /**
   * Check if a transition is valid
   */
  canTransition(to: T): boolean {
    if (!this.config.transitions) {
      return true; // Allow all transitions if no rules defined
    }

    const transition = this.config.transitions.find(
      (t) => t.from === this.currentState && t.to === to
    );

    if (!transition) {
      return false;
    }

    if (transition.condition) {
      return transition.condition();
    }

    return true;
  }

  /**
   * Transition to a new state
   */
  transition(to: T): boolean {
    if (!this.canTransition(to)) {
      const debugId = this.config.debugId ? `[${this.config.debugId}] ` : '';
      console.warn(
        `${debugId}Invalid transition: ${this.currentState} → ${to}`
      );
      return false;
    }

    const previousState = this.currentState;
    this.currentState = to;
    this.stateRef.current = to;

    const debugId = this.config.debugId ? `[${this.config.debugId}] ` : '';
    console.log(
      `${debugId}State transition: ${previousState} → ${to}`
    );

    if (this.config.onStateChange) {
      this.config.onStateChange(to, previousState);
    }

    return true;
  }

  /**
   * Schedule a delayed transition
   * @param to Target state
   * @param delayMs Delay in milliseconds
   * @param timerId Unique identifier for this timer (allows cancellation)
   * @param condition Optional condition to check before transitioning
   */
  scheduleTransition(
    to: T,
    delayMs: number,
    timerId: string,
    condition?: () => boolean
  ): void {
    // Clear any existing timer with the same ID
    this.clearTimer(timerId);

    const timer = setTimeout(() => {
      this.timers.delete(timerId);

      if (condition && !condition()) {
        const debugId = this.config.debugId ? `[${this.config.debugId}] ` : '';
        console.log(
          `${debugId}Scheduled transition to ${to} cancelled - condition not met`
        );
        return;
      }

      this.transition(to);
    }, delayMs);

    this.timers.set(timerId, timer);
  }

  /**
   * Clear a scheduled transition timer
   */
  clearTimer(timerId: string): void {
    const timer = this.timers.get(timerId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(timerId);
    }
  }

  /**
   * Clear all scheduled timers
   */
  clearAllTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * Reset the state machine to its initial state
   */
  reset(): void {
    this.clearAllTimers();
    this.transition(this.config.initialState);
  }

  /**
   * Update the state change callback
   */
  setOnStateChange(callback: (newState: T, previousState: T) => void): void {
    this.config.onStateChange = callback;
  }

  /**
   * Cleanup - should be called when the state machine is no longer needed
   */
  destroy(): void {
    this.clearAllTimers();
  }
}

