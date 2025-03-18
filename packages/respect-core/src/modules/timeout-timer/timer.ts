import { DEFAULT_RESPECT_TIMEOUT } from '../../consts';

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
    const timeout = isNaN(+(process.env.RESPECT_TIMEOUT as string))
      ? DEFAULT_RESPECT_TIMEOUT
      : +(process.env.RESPECT_TIMEOUT as string);
    return Date.now() - this.startTime > timeout;
  }
}
