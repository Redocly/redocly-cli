import { describe, expect, it } from 'vitest';

import { collectingLogger, silentLogger } from '../logger.js';

describe('logger', () => {
  it('collects lines by channel', () => {
    const logger = collectingLogger();
    logger.log('a');
    logger.warn('b');
    logger.error('c');
    expect(logger.lines).toEqual(['a']);
    expect(logger.warnings).toEqual(['b']);
    expect(logger.errors).toEqual(['c']);
  });

  it('silent logger accepts every channel', () => {
    expect(() => {
      silentLogger.log('a');
      silentLogger.warn('b');
      silentLogger.error('c');
    }).not.toThrow();
  });

  it('collects output lines separately from progress lines', () => {
    const logger = collectingLogger();
    logger.log('progress');
    logger.output('{"report":true}');
    expect(logger.lines).toEqual(['progress']);
    expect(logger.outputs).toEqual(['{"report":true}']);
  });
});
