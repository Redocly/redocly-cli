import { isTimedOut } from '../../timeout-timer/timer';

describe('Timer', () => {
  it('should return true if the timer is timed out', () => {
    process.env.RESPECT_TIMEOUT = '0';
    const startedAt = performance.now();
    expect(isTimedOut(startedAt)).toBe(true);
    delete process.env.RESPECT_TIMEOUT;
  });

  it('should return false if the timer is not timed out', () => {
    const startedAt = performance.now();
    expect(isTimedOut(startedAt)).toBe(false);
  });
});
