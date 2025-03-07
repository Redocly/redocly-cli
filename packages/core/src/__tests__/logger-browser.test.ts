/**
 * @jest-environment jsdom
 */

import * as colorette from 'colorette';
import { logger, colorize } from '../logger';

vi.mock('colorette', async () => {
  const actual = await vi.importActual('colorette');
  return {
    ...actual,
    cyan: vi.fn(),
  }
})

describe('Logger in Browser', () => {
  it('should call "console.error"', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('error');

    expect(error).toBeCalledTimes(1);
    expect(error).toBeCalledWith('error');

    error.mockRestore();
  });

  it('should call "console.log"', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('info');

    expect(log).toBeCalledTimes(1);
    expect(log).toBeCalledWith('info');

    log.mockRestore();
  });

  it('should call "console.warn"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.warn('warn');

    expect(warn).toBeCalledTimes(1);
    expect(warn).toBeCalledWith('warn');

    warn.mockRestore();
  });
});

describe('colorize in Browser', () => {
  it('should not call original colorette lib', () => {
    const color = 'cyan';
    const colorized = colorize.cyan(color);

    expect(colorette.cyan).not.toBeCalled();
    expect(colorized).toEqual(color);
  });
});
