import { MockInstance } from 'vitest';

import * as colorette from 'colorette';
import { logger, colorize, RESET_ESCAPE_CODE_IN_TERMINAL } from '../logger.js';

describe('Logger in nodejs', () => {
  let spyingStderr: MockInstance;
  let spyingStdout: MockInstance;

  beforeEach(() => {
    spyingStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    spyingStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
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

  it('should call "process.stdout.write" for output printNewLine', () => {
    logger.printNewLine();

    expect(spyingStdout).toBeCalledTimes(1);
    expect(spyingStdout).toBeCalledWith(`${RESET_ESCAPE_CODE_IN_TERMINAL}\n`);
  });

  it('should call "process.stdout.write" for output printSeparator', () => {
    logger.printSeparator('separator');

    expect(spyingStdout).toBeCalledTimes(1);
    expect(spyingStdout).toBeCalledWith(expect.stringContaining(colorize.gray('separator')));
  });

  it('should call output with indent', () => {
    const indent = logger.indent('indent', 2);
    expect(indent).toEqual('\xa0\xa0indent');
  });
});

describe('colorize in nodejs', () => {
  it('should call original colorette lib', () => {
    vi.mock('colorette', async () => {
      const actual = await vi.importActual('colorette');
      return {
        ...actual,
        cyan: vi.fn(),
      };
    });
    const color = 'cyan';
    const colorized = colorize.cyan(color);

    expect(colorette.cyan).toBeCalledWith(color);
    expect(colorized).toEqual(colorette[color](color));
  });
});
