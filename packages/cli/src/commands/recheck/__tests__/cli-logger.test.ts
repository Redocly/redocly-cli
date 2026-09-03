import { logger } from '@redocly/openapi-core';
import { describe, expect, it, vi } from 'vitest';

import { createCliLogger } from '../cli-logger.js';

describe('createCliLogger', () => {
  it('routes engine channels onto the CLI logger with a newline each', () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => true as never);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => true as never);
    const error = vi.spyOn(logger, 'error').mockImplementation(() => true as never);
    const output = vi.spyOn(logger, 'output').mockImplementation(() => true as never);

    const engineLogger = createCliLogger();
    engineLogger.log('progress');
    engineLogger.warn('careful');
    engineLogger.error('failed');
    engineLogger.output('{"report":true}');

    expect(info).toHaveBeenCalledWith('progress\n');
    expect(warn).toHaveBeenCalledWith('careful\n');
    expect(error).toHaveBeenCalledWith('failed\n');
    expect(output).toHaveBeenCalledWith('{"report":true}\n');
    vi.restoreAllMocks();
  });
});
