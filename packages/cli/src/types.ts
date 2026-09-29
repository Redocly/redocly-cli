import type { RuleSeverity } from '@redocly/openapi-core';

import type { BuildDocsArgv } from './commands/build-docs/types.js';
import type { BundleArgv } from './commands/bundle.js';
import type { DriftArgv } from './commands/drift/index.js';
import type { EjectGeneratorCommandArgv } from './commands/eject-generator.js';
import type { EjectArgv } from './commands/eject.js';
import type { GenerateArazzoCommandArgv } from './commands/generate-arazzo/index.js';
import type { InspectNodeTypesArgv } from './commands/inspect-node-types.js';
import type { IntrospectMcpCommandArgv } from './commands/introspect-mcp/index.js';
import type { JoinArgv } from './commands/join/types.js';
import type { LintArgv } from './commands/lint.js';
import type { LoginArgv } from './commands/login.js';
import type { PreviewProjectArgv } from './commands/preview-project/types.js';
import type { ProxyArgv } from './commands/proxy/index.js';
import type { PushStatusArgv } from './commands/push-status.js';
import type { PushArgv } from './commands/push.js';
import type { RecheckArgv } from './commands/recheck/types.js';
import type { RespectArgv } from './commands/respect/index.js';
import type { ScorecardClassicArgv } from './commands/scorecard-classic/types.js';
import type { SplitArgv } from './commands/split/types.js';
import type { StatsArgv } from './commands/stats/index.js';
import type { TranslationsArgv } from './commands/translations.js';

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
export const outputExtensions = ['json', 'yaml', 'yml'] as const;
export type OutputExtension = (typeof outputExtensions)[number];
export type CommandArgv = (
  | StatsArgv
  | SplitArgv
  | JoinArgv
  | LintArgv
  | InspectNodeTypesArgv
  | BundleArgv
  | LoginArgv
  | BuildDocsArgv
  | PushArgv
  | PushStatusArgv
  | PreviewProjectArgv
  | TranslationsArgv
  | EjectArgv
  | RespectArgv
  | DriftArgv
  | ProxyArgv
  | GenerateArazzoCommandArgv
  | EjectGeneratorCommandArgv
  | IntrospectMcpCommandArgv
  | RecheckArgv
  | ScorecardClassicArgv
) &
  VerifyConfigOptions;

export type VerifyConfigOptions = {
  config?: string;
  'lint-config'?: RuleSeverity;
};
