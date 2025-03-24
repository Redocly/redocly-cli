import { pause } from '@redocly/openapi-core';
import { Timer } from '../../timeout-timer/timer.js';

describe('Timer', () => {
  afterEach(() => {
    delete process.env.RESPECT_TIMEOUT;
  });

  it('should be a singleton', () => {
    const timer1 = Timer.getInstance();
    const timer2 = Timer.getInstance();
    expect(timer1).toBe(timer2);
  });

  it('should return true if the timer is timed out', async () => {
    process.env.RESPECT_TIMEOUT = '100';

    const timer = Timer.getInstance();
    await pause(200);
    expect(timer.isTimedOut()).toBe(true);
  });

  it('should return false if the timer is not timed out', () => {
    const timer = Timer.getInstance();
    expect(timer.isTimedOut()).toBe(false);
  });
});
