import { logger } from '@redocly/openapi-core';
import { vi } from 'vitest';

// `stderr` collects the info, warn, and error lines; `stdout` collects the output lines.
export function captureLogger(): { stderr: string[]; stdout: string[] } {
  const stderr: string[] = [];
  const stdout: string[] = [];
  vi.spyOn(logger, 'info').mockImplementation((line) => void stderr.push(line));
  vi.spyOn(logger, 'warn').mockImplementation((line) => void stderr.push(line));
  vi.spyOn(logger, 'error').mockImplementation((line) => void stderr.push(line));
  vi.spyOn(logger, 'output').mockImplementation((line) => void stdout.push(line));
  return { stderr, stdout };
}
