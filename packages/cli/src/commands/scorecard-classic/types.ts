import type { ScorecardConfig } from '@redocly/config';
import type { NormalizedProblem, OutputFormat, ResolvedConfig } from '@redocly/openapi-core';

export type ScorecardClassicArgv = {
  api: string;
  config: string;
  'project-url'?: string;
  format: OutputFormat;
  'target-level'?: string;
  verbose?: boolean;
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
