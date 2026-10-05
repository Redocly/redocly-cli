import type { OutputFormat } from '@redocly/openapi-core';

export type ScorecardClassicOutputFormat =
  | Extract<OutputFormat, 'stylish' | 'json' | 'checkstyle'>
  | 'junit';

export type ScorecardClassicArgv = {
  api?: string;
  'project-url'?: string;
  format: ScorecardClassicOutputFormat;
  'target-level'?: string;
  verbose?: boolean;
};
