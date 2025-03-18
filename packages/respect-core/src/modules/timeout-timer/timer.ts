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
    const parsedTimeout = parseInt(process.env.RESPECT_TIMEOUT as string, 10);
    const timeout = isNaN(parsedTimeout) ? DEFAULT_RESPECT_TIMEOUT : parsedTimeout;
    return Date.now() - this.startTime > timeout;
  }
}
