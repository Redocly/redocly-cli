/**
 * Format elapsed time in milliseconds to a human readable string
 */
export function formatElapsedTime(elapsedMs: number): string {
  return elapsedMs < 1000 ? `${elapsedMs}ms` : `${(elapsedMs / 1000).toFixed(1)}s`;
}

/**
 * Simple timer utility for measuring execution time
 */
export class Timer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get elapsed time since timer creation
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get formatted elapsed time string
   */
  elapsedString(): string {
    return formatElapsedTime(this.elapsed());
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.startTime = Date.now();
  }
}
