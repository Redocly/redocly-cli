import * as colorette from 'colorette';
import { logger, colorize } from '../logger';

describe('Logger in nodejs', () => {
  it('should call "process.stderr.write" for error severity', () => {
    const spyingStderr = jest.spyOn(process.stderr, 'write').mockImplementation();
    
    logger.error('error');

    expect(spyingStderr).toBeCalledTimes(1);
    expect(spyingStderr).toBeCalledWith('error');

    spyingStderr.mockRestore();
  });

  it('should call "process.stderr.write" for warn severity', () => {
    const spyingStderr = jest.spyOn(process.stderr, 'write').mockImplementation();

    logger.warn('warn');

    expect(spyingStderr).toBeCalledTimes(1);
    expect(spyingStderr).toBeCalledWith('warn');
    
    spyingStderr.mockRestore();
  });

  it('should call "process.stdout.write"', () => {
    const spyingStdout = jest.spyOn(process.stdout, 'write').mockImplementation();

    logger.info('info');

    expect(spyingStdout).toBeCalledTimes(1);
    expect(spyingStdout).toBeCalledWith('info');

    spyingStdout.mockRestore();
  });
});

describe('colorize in nodejs', () => {
  it('should call original colorette lib', () => {
    const color = 'cyan';
    const spyingCyan = jest.spyOn(colorette, color);

    const colorized = colorize.cyan(color);

    expect(spyingCyan).toBeCalledWith(color);
    expect(colorized).toEqual(colorette[color](color));
  });
});
