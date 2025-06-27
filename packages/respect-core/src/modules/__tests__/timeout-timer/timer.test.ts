import { pause } from '@redocly/openapi-core';
import { Timer } from '../../timeout-timer/timer.js';

describe('Timer', () => {
  beforeEach(() => {
    Timer.reset();
  });

  it('should be a singleton', () => {
    const timer1 = Timer.getInstance(3_600_000);
    const timer2 = Timer.getInstance(3_600_000);
    expect(timer1).toBe(timer2);
  });

  it('should return true if the timer is timed out', async () => {
    const timer = Timer.getInstance(1);
    await pause(200);
    expect(timer.isTimedOut()).toBe(true);
  });

  it('should return false if the timer is not timed out', () => {
    const timer = Timer.getInstance(3_600_000);
    expect(timer.isTimedOut()).toBe(false);
  });
});
