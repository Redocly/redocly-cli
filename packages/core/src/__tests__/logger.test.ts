import * as colorette from 'colorette';
import { type MockInstance } from 'vitest';

import { logger, colorize } from '../logger.js';

describe('Logger in nodejs', () => {
  let spyingStderr: MockInstance;
  let spyingStdout: MockInstance;

  beforeEach(() => {
    spyingStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    spyingStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('should call "process.stderr.write" for error severity', () => {
    logger.error('error');

    expect(spyingStderr).toHaveBeenCalledTimes(1);
    expect(spyingStderr).toHaveBeenCalledWith(colorette.red('error'));
  });

  it('should call "process.stderr.write" for warn severity', () => {
    logger.warn('warn');

    expect(spyingStderr).toHaveBeenCalledTimes(1);
    expect(spyingStderr).toHaveBeenCalledWith(colorette.yellow('warn'));
  });

  it('should call "process.stderr.write" for info severity', () => {
    logger.info('info');

    expect(spyingStderr).toHaveBeenCalledTimes(1);
    expect(spyingStderr).toHaveBeenCalledWith('info');
  });

  it('should call "process.stdout.write" for output printNewLine', () => {
    logger.printNewLine();

    expect(spyingStdout).toHaveBeenCalledTimes(1);
    expect(spyingStdout).toHaveBeenCalledWith(' \n');
  });

  it('should call "process.stdout.write" for output printSeparator', () => {
    logger.printSeparator('separator');

    expect(spyingStdout).toHaveBeenCalledTimes(1);
    expect(spyingStdout).toHaveBeenCalledWith(expect.stringContaining('separator'));
    expect(spyingStdout).toHaveBeenCalledWith(
      colorize.gray(
        'separatorseparatorseparatorseparatorseparatorseparatorseparatorseparatorseparato'
      )
    );
  });

  it('should call output with indent', () => {
    const indent = logger.indent('indent', 2);
    expect(indent).toEqual('\xa0\xa0indent');
  });
});

describe('colorize in nodejs', () => {
  it('should color with colorette', () => {
    expect(colorize.cyan('cyan')).toEqual(colorette.cyan('cyan'));
  });
});
