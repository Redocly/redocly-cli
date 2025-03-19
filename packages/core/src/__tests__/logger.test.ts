import { MockInstance } from 'vitest';

import * as colorette from 'colorette';
import { logger, colorize } from '../logger';

vi.mock('colorette', async () => {
  const actual = await vi.importActual('colorette');
  return {
    ...actual,
    cyan: vi.fn(),
  };
});

describe('Logger in nodejs', () => {
  let spyingStderr: MockInstance;

  beforeEach(() => {
    spyingStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
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
    const colorized = colorize.cyan(color);

    expect(colorette.cyan).toBeCalledWith(color);
    expect(colorized).toEqual(colorette[color](color));
  });
});
