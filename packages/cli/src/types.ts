import type { BundleOutputFormat, Config, RuleSeverity } from '@redocly/openapi-core';
import type { RespectOptions, GenerateArazzoFileOptions } from '@redocly/respect-core';
import type { LintOptions } from './commands/lint.js';
import type { BundleOptions } from './commands/bundle.js';
import type { JoinOptions } from './commands/join.js';
import type { LoginOptions, LogoutOptions } from './commands/auth.js';
import type { StatsOptions } from './commands/stats.js';
import type { SplitOptions } from './commands/split/index.js';
import type { BuildDocsArgv } from './commands/build-docs/types.js';
import type { PushOptions } from './reunite/commands/push.js';
import type { PushStatusOptions } from './reunite/commands/push-status.js';
import type { PreviewProjectOptions } from './commands/preview-project/types.js';
import type { TranslationsOptions } from './commands/translations.js';
import type { EjectOptions } from './commands/eject.js';

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
