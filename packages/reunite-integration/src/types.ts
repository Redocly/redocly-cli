import type { Config } from '@redocly/openapi-core';

export type ReuniteCommandArgs<T> = {
  argv: T;
  config: Config;
  version: string;
};
