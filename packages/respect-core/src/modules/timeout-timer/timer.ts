import { RESPECT_TIMEOUT } from '../../consts';

export class Timer {
  private static instance: Timer;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
  }

  public static getInstance(): Timer {
    if (!Timer.instance) {
      Timer.instance = new Timer();
    }
    return Timer.instance;
  }

  public getRemainingTime(): number {
    const elapsedTime = Date.now() - this.startTime;
    return Math.max(0, Number(RESPECT_TIMEOUT) - elapsedTime);
  }

  public isTimedOut(): boolean {
    return this.getRemainingTime() <= 0;
  }
}
