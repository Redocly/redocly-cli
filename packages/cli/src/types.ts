import type { BundleOutputFormat, Region, Config } from '@redocly/openapi-core';
import type { LintOptions } from './commands/lint';
import type { BundleOptions } from './commands/bundle';
import type { JoinOptions } from './commands/join';
import type { LoginOptions } from './commands/login';
import type { PushOptions } from './commands/push';
import type { StatsOptions } from './commands/stats';
import type { SplitOptions } from './commands/split';
import type { PreviewDocsOptions } from './commands/preview-docs';
import type { BuildDocsArgv } from './commands/build-docs/types';

export type Totals = {
  errors: number;
  warnings: number;
  ignored: number;
};
export type Entrypoint = {
  path: string;
  alias?: string;
};
export const outputExtensions = ['json', 'yaml', 'yml'] as ReadonlyArray<BundleOutputFormat>;
export type OutputExtensions = 'json' | 'yaml' | 'yml' | undefined;
export const regionChoices = ['us', 'eu'] as ReadonlyArray<Region>;
export type CommandOptions =
  | StatsOptions
  | SplitOptions
  | JoinOptions
  | PushOptions
  | LintOptions
  | BundleOptions
  | LoginOptions
  | PreviewDocsOptions
  | BuildDocsArgv;
export type Skips = {
  'skip-rule'?: string[];
  'skip-decorator'?: string[];
  'skip-preprocessor'?: string[];
};

export type ConfigApis = Pick<Config, 'apis' | 'configFile'>;
