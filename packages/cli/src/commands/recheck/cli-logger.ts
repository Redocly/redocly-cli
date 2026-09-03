import { logger } from '@redocly/openapi-core';
import type { Logger } from '@redocly/recheck';

// Progress and diagnostics go to stderr; report payloads go to stdout, so
// `--format json` and `github-actions` stay machine-readable.
export function createCliLogger(): Logger {
  return {
    log: (line) => void logger.info(`${line}\n`),
    warn: (line) => void logger.warn(`${line}\n`),
    error: (line) => void logger.error(`${line}\n`),
    output: (line) => void logger.output(`${line}\n`),
  };
}
