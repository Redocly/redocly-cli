import type { BundleOutputFormat, Config, RuleSeverity } from '@redocly/openapi-core';
import type { RespectOptions, GenerateArazzoFileOptions } from '@redocly/respect-core';
import type { LintOptions } from './commands/lint';
import type { BundleOptions } from './commands/bundle';
import type { JoinOptions } from './commands/join';
import type { LoginOptions, LogoutOptions } from './commands/auth';
import type { StatsOptions } from './commands/stats';
import type { SplitOptions } from './commands/split';
import type { BuildDocsArgv } from './commands/build-docs/types';
import type { PushOptions } from './reunite/commands/push';
import type { PushStatusOptions } from './reunite/commands/push-status';
import type { PreviewProjectOptions } from './commands/preview-project/types';
import type { TranslationsOptions } from './commands/translations';
import type { EjectOptions } from './commands/eject';

export type Totals = {
  errors: number;
  warnings: number;
  ignored: number;
};
export type Entrypoint = {
  path: string;
  alias?: string;
  output?: string;
};
export const outputExtensions = ['json', 'yaml', 'yml'] as ReadonlyArray<BundleOutputFormat>; // FIXME: use one source of truth
export type OutputExtensions = 'json' | 'yaml' | 'yml' | undefined; // FIXME: use one source of truth
export type CommandOptions =
  | StatsOptions
  | SplitOptions
  | JoinOptions
  | LintOptions
  | BundleOptions
  | LoginOptions
  | LogoutOptions
  | BuildDocsArgv
  | PushOptions
  | PushStatusOptions
  | PreviewProjectOptions
  | TranslationsOptions
  | EjectOptions
  | RespectOptions
  | GenerateArazzoFileOptions;

export type VerifyConfigOptions = {
  config?: string;
  'lint-config'?: RuleSeverity;
};

export type ConfigApis = Pick<Config, 'apis' | 'configFile'>;
