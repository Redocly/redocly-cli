export class Timer {
  private static instance: Timer;
  private startTime: number;
  private timeout: number;

  private constructor(timeout: number) {
    this.startTime = Date.now();
    this.timeout = timeout;
  }

  public static getInstance(timeout: number): Timer {
    if (!Timer.instance) {
      Timer.instance = new Timer(timeout);
    }
    return Timer.instance;
  }

  public static reset(): void {
    Timer.instance = undefined as any;
  }

  public isTimedOut(): boolean {
    return Date.now() - this.startTime > this.timeout;
  }
}
