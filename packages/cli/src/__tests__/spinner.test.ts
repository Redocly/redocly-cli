import { MockInstance } from 'vitest';

import { Spinner } from '../utils/spinner';
import * as process from 'process';

vi.useFakeTimers();

describe('Spinner', () => {
  const IS_TTY = process.stdout.isTTY;

  let writeMock: MockInstance;
  let spinner: Spinner;

  beforeEach(() => {
    process.stdout.isTTY = true;
    writeMock = vi.spyOn(process.stdout, 'write').mockImplementation(vi.fn());
    spinner = new Spinner();
  });

  afterEach(() => {
    writeMock.mockRestore();
    vi.clearAllTimers();
  });

  afterAll(() => {
    process.stdout.isTTY = IS_TTY;
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
    process.stdout.isTTY = false;
    spinner.start('Loading');
    vi.advanceTimersByTime(300);
    expect(writeMock).toHaveBeenCalledTimes(1);
  });
});
