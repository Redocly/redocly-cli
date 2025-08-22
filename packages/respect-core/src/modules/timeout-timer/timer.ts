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
    console.log('getting instance', Timer.instance.startTime);
    return Timer.instance;
  }

  public static reset(): void {
    if (Timer.instance) {
      console.log('resetting timer', Timer.instance.startTime);
    }
    Timer.instance = undefined as any;
  }

  public isTimedOut(): boolean {
    return Date.now() - this.startTime > this.timeout;
  }
}
