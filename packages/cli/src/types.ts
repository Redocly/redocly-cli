import type { BundleOutputFormat, Region, Config } from '@redocly/openapi-core';
import type { ArgumentsCamelCase } from 'yargs';
import type { LintOptions } from './commands/lint.js';
import type { BundleOptions } from './commands/bundle.js';
import type { JoinOptions } from './commands/join.js';
import type { LoginOptions } from './commands/login.js';
import type { PushOptions } from './commands/push.js';
import type { StatsOptions } from './commands/stats.js';
import type { SplitOptions } from './commands/split/index.js';
import type { PreviewDocsOptions } from './commands/preview-docs/index.js';
import type { BuildDocsArgv } from './commands/build-docs/types.js';
import type { PushOptions as CMSPushOptions } from './cms/commands/push.js';
import type { PushStatusOptions } from './cms/commands/push-status.js';
import type { PreviewProjectOptions } from './commands/preview-project/types.js';

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
  | CMSPushOptions
  | LintOptions
  | BundleOptions
  | LoginOptions
  | PreviewDocsOptions
  | BuildDocsArgv
  | PushStatusOptions
  | VerifyConfigOptions
  | PreviewProjectOptions;

export type VerifyConfigOptions = {
  config?: string;
  'lint-config'?: 'warning' | 'error' | 'off';
};

export type Skips = {
  'skip-rule'?: string[];
  'skip-decorator'?: string[];
  'skip-preprocessor'?: string[];
};

export type ConfigApis = Pick<Config, 'apis' | 'configFile'>;

export type PushArguments = ArgumentsCamelCase<PushOptions & CMSPushOptions & { apis: string[] }>;
