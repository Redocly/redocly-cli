import * as process from 'node:process';
import { type MockInstance } from 'vitest';

import { Spinner } from '../utils/spinner.js';

describe('Spinner', () => {
  const IS_TTY = process.stderr.isTTY;

  let writeMock: MockInstance;
  let spinner: Spinner;

  beforeEach(() => {
    vi.useFakeTimers();
    process.stderr.isTTY = true;
    writeMock = vi.spyOn(process.stderr, 'write').mockImplementation(vi.fn());
    spinner = new Spinner();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  afterAll(() => {
    process.stderr.isTTY = IS_TTY;
  });

  it('starts the spinner', () => {
    spinner.start('Loading');
    vi.advanceTimersByTime(100);
    expect(writeMock).toHaveBeenCalledWith('\r⠋ Loading');
  });

  it('stops the spinner', () => {
    spinner.start('Loading');
    spinner.stop();
    expect(writeMock).toHaveBeenCalledWith('\r');
  });

  it('should write 3 frames', () => {
    spinner.start('Loading');
    vi.advanceTimersByTime(300);
    expect(writeMock).toHaveBeenCalledTimes(3);
  });

  it('should call write 1 times if CI set to true', () => {
    process.stderr.isTTY = false;
    spinner.start('Loading');
    vi.advanceTimersByTime(300);
    expect(writeMock).toHaveBeenCalledTimes(1);
  });
});
