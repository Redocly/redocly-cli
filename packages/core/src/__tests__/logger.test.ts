import * as colorette from 'colorette';
import { logger, colorize } from '../logger';
import { type SpyInstance } from 'vitest';

describe('Logger in nodejs', () => {
  let spyingStderr: SpyInstance;

  beforeEach(() => {
    spyingStderr = vi.spyOn(process.stderr, 'write').mockImplementation((value) => {
      console.log(value);

      return true;
    });
  });

  afterEach(() => {
    spyingStderr.mockRestore();
  });

  it('should call "process.stderr.write" for error severity', () => {
    logger.error('error');

    expect(spyingStderr).toBeCalledTimes(1);
    expect(spyingStderr).toBeCalledWith(colorette.red('error'));
  });

  it('should call "process.stderr.write" for warn severity', () => {
    logger.warn('warn');

    expect(spyingStderr).toBeCalledTimes(1);
    expect(spyingStderr).toBeCalledWith(colorette.yellow('warn'));
  });

  it('should call "process.stderr.write" for info severity', () => {
    logger.info('info');

    expect(spyingStderr).toBeCalledTimes(1);
    expect(spyingStderr).toBeCalledWith('info');
  });
});

describe('colorize in nodejs', () => {
  it('should call original colorette lib', () => {
    const color = 'cyan';
    const spyingCyan = vi.spyOn(colorette, color);

    const colorized = colorize.cyan(color);

    expect(spyingCyan).toBeCalledWith(color);
    expect(colorized).toEqual(colorette[color](color));
  });
});
