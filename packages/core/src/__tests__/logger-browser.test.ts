/**
 * @vitest-environment jsdom
 */

import * as colorette from 'colorette';

import { logger, colorize } from '../logger.js';

vi.mock('colorette');

describe('Logger in Browser', () => {
  it('should call "console.error"', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('error');

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('error');
  });

  it('should call "console.log"', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.info('info');

    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('info');
  });

  it('should call "console.warn"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.warn('warn');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('warn');
  });
});

describe('colorize in Browser', () => {
  it('should not call original colorette lib', () => {
    const color = 'cyan';
    const colorized = colorize.cyan(color);

    expect(colorette.cyan).not.toHaveBeenCalled();
    expect(colorized).toEqual(color);
  });
});
