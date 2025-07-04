import type { GenerateArazzoCommandArgv } from './commands/generate-arazzo.js';
import type { BundleOutputFormat, RuleSeverity } from '@redocly/openapi-core';
import type { RespectArgv } from './commands/respect/index.js';
import type { LintArgv } from './commands/lint.js';
import type { BundleArgv } from './commands/bundle.js';
import type { JoinArgv } from './commands/join.js';
import type { LoginArgv, LogoutArgv } from './commands/auth.js';
import type { StatsArgv } from './commands/stats.js';
import type { SplitArgv } from './commands/split/index.js';
import type { BuildDocsArgv } from './commands/build-docs/types.js';
import type { PushArgv } from './reunite/commands/push.js';
import type { PushStatusArgv } from './reunite/commands/push-status.js';
import type { PreviewProjectArgv } from './commands/preview-project/types.js';
import type { TranslationsArgv } from './commands/translations.js';
import type { EjectArgv } from './commands/eject.js';

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
export const outputExtensions = ['json', 'yaml', 'yml'] as ReadonlyArray<BundleOutputFormat>; // FIXME: use one source of truth (2.0)
export type OutputExtensions = 'json' | 'yaml' | 'yml' | undefined; // FIXME: use one source of truth (2.0)
export type CommandArgv =
  | StatsArgv
  | SplitArgv
  | JoinArgv
  | LintArgv
  | BundleArgv
  | LoginArgv
  | LogoutArgv
  | BuildDocsArgv
  | PushArgv
  | PushStatusArgv
  | PreviewProjectArgv
  | TranslationsArgv
  | EjectArgv
  | RespectArgv
  | GenerateArazzoCommandArgv;

export type VerifyConfigOptions = {
  config?: string;
  'lint-config'?: RuleSeverity;
};
