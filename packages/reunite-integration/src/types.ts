import type { Config } from '@redocly/openapi-core';

/**
 * Arguments every handler takes.
 * `version` is the Redocly CLI version the caller acts for; it goes into the `user-agent` header.
 */
export type ReuniteCommandArgs<T> = {
  argv: T;
  config: Config;
  version: string;
};
