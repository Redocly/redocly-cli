import { Timer } from '../../timeout-timer/timer';

describe('Timer', () => {
  it('should be a singleton', () => {
    const timer1 = Timer.getInstance();
    const timer2 = Timer.getInstance();
    expect(timer1).toBe(timer2);
  });

  it('should return true if the timer is timed out', () => {
    process.env.RESPECT_TIMEOUT = '0';
    const timer = Timer.getInstance();
    expect(timer.isTimedOut()).toBe(true);
    delete process.env.RESPECT_TIMEOUT;
  });

  it('should return false if the timer is not timed out', () => {
    const timer = Timer.getInstance();
    expect(timer.isTimedOut()).toBe(false);
  });
});
