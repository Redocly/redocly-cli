export function formatElapsedTime(elapsedMs: number): string {
  return elapsedMs < 1000 ? `${elapsedMs}ms` : `${(elapsedMs / 1000).toFixed(1)}s`;
}

export class Timer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  elapsedString(): string {
    return formatElapsedTime(this.elapsed());
  }

  reset(): void {
    this.startTime = Date.now();
  }
}
