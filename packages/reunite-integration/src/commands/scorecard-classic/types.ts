import type { ScorecardConfig } from '@redocly/config';
import type {
  CollectSpecData,
  NormalizedProblem,
  OutputFormat,
  ResolvedConfig,
} from '@redocly/openapi-core';

import type { ReuniteCommandArgs } from '../../types.js';

export type ScorecardClassicOutputFormat =
  | Extract<OutputFormat, 'stylish' | 'json' | 'checkstyle'>
  | 'junit';

export type ScorecardClassicArgv = {
  'project-url'?: string;
  format: ScorecardClassicOutputFormat;
  'target-level'?: string;
  verbose?: boolean;
};

/**
 * The caller resolves `api` from its own arguments and configuration,
 * then hands the scorecard the path to read and the alias it matched.
 */
export type ScorecardClassicArgs = ReuniteCommandArgs<ScorecardClassicArgv> & {
  api: { path: string; alias?: string };
  collectSpecData?: CollectSpecData;
};

export type ScorecardProblem = NormalizedProblem & { scorecardLevel?: string };

export type RemoteScorecardAndPlugins = {
  scorecard: ScorecardConfig;
  plugins: string | undefined;
};

export type Project = {
  id: `prj_${string}`;
  slug: string;
  config: ResolvedConfig & { pluginsUrl?: string; scorecardClassic?: ScorecardConfig };
};
