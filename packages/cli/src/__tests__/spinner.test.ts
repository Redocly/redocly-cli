import { Spinner } from '../spinner';
import * as process from 'process';

jest.useFakeTimers();

describe('Spinner', () => {
  const CI_VALUE = process.env.CI;

  let writeMock: jest.SpyInstance;
  let spinner: Spinner;

  beforeEach(() => {
    process.env.CI = '';
    writeMock = jest.spyOn(process.stdout, 'write').mockImplementation(jest.fn());
    spinner = new Spinner();
  });

  afterEach(() => {
    writeMock.mockRestore();
    jest.clearAllTimers();
  });

  afterAll(() => {
    process.env.CI = CI_VALUE;
  });

  it('starts the spinner', () => {
    spinner.start('Loading');
    jest.advanceTimersByTime(100);
    expect(writeMock).toHaveBeenCalledWith('\r⠋ Loading');
  });

  it('stops the spinner', () => {
    spinner.start('Loading');
    spinner.stop();
    expect(writeMock).toHaveBeenCalledWith('\r');
  });

  it('should write 3 frames', () => {
    spinner.start('Loading');
    jest.advanceTimersByTime(300);
    expect(writeMock).toHaveBeenCalledTimes(3);
  });

  it('should call write 1 times if CI set to true', () => {
    process.env.CI = 'true';
    spinner.start('Loading');
    jest.advanceTimersByTime(300);
    expect(writeMock).toHaveBeenCalledTimes(1);
  });
});
