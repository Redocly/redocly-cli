import { Spinner } from '../spinner';
import * as process from 'process';

jest.useFakeTimers();

describe('Spinner', () => {
  let writeMock: any;
  let spinner: Spinner;

  beforeEach(() => {
    writeMock = jest.spyOn(process.stdout, 'write').mockImplementation(jest.fn());
    spinner = new Spinner();
  });

  afterEach(() => {
    writeMock.mockRestore();
    jest.clearAllTimers();
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

  it('cycles through frames', () => {
    spinner.start('Loading');
    jest.advanceTimersByTime(300);
    expect(writeMock).toHaveBeenCalledTimes(3);
  });
});
