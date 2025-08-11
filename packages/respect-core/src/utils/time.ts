import { isBrowser } from '@redocly/openapi-core';

// Function from @redocly/cli
export function getExecutionTime(startedAt: number) {
  return !isBrowser && process.env.NODE_ENV === 'test'
    ? '<test>ms'
    : `${Math.ceil(performance.now() - startedAt)}ms`;
}
