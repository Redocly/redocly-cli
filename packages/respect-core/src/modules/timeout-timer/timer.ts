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

  private getTimeout(): number {
    return parseInt(process.env.RESPECT_TIMEOUT || RESPECT_TIMEOUT.toString(), 10);
  }

  public getRemainingTime(): number {
    const elapsedTime = Date.now() - this.startTime;
    const timeout = this.getTimeout();
    return Math.max(0, timeout - elapsedTime);
  }

  public isTimedOut(): boolean {
    return this.getRemainingTime() <= 0;
  }
}
