/**
 * @jest-environment jsdom
 */

import * as colorette from 'colorette';
import { logger, colorize } from '../logger';

describe('Logger in Browser', () => {
  it('should call "console.error"', () => {
    const error = vi.spyOn(console, 'error').mockImplementation((...args) => {
      console.log('error', ...args);
    });

    logger.error('error');

    expect(error).toBeCalledTimes(1);
    expect(error).toBeCalledWith('error');

    error.mockRestore();
  });

  it('should call "console.log"', () => {
    const log = vi.spyOn(console, 'log').mockImplementation((...args) => {
      console.log('log', ...args);
    });

    logger.info('info');

    expect(log).toBeCalledTimes(1);
    expect(log).toBeCalledWith('info');

    log.mockRestore();
  });

  it('should call "console.warn"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      console.log('warn', ...args);
    });

    logger.warn('warn');

    expect(warn).toBeCalledTimes(1);
    expect(warn).toBeCalledWith('warn');

    warn.mockRestore();
  });
});

describe('colorize in Browser', () => {
  it('should not call original colorette lib', () => {
    const color = 'cyan';
    const spyingCyan = vi.spyOn(colorette, color);

    const colorized = colorize.cyan(color);

    expect(spyingCyan).not.toBeCalled();
    expect(colorized).toEqual(color);
  });
});
