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

  public isTimedOut(): boolean {
    const elapsedTime = Date.now() - this.startTime;
    const timeout = parseInt(process.env.RESPECT_TIMEOUT || RESPECT_TIMEOUT.toString(), 10);
    const remainingTime = Math.max(0, timeout - elapsedTime);

    return remainingTime <= 0;
  }
}
