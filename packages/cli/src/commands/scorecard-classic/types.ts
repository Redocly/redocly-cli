import type { VerifyConfigOptions } from '../../types.js';
import type { NormalizedProblem, OutputFormat, ResolvedConfig } from '@redocly/openapi-core';

export type ScorecardClassicArgv = {
  api: string;
  config: string;
  'project-url'?: string;
  format: OutputFormat;
  verbose?: boolean;
} & VerifyConfigOptions;

export type ScorecardProblem = NormalizedProblem & { scorecardLevel?: string };

export type RemoteScorecardAndPlugins = {
  scorecard: ResolvedConfig['scorecard'];
  plugins: string | undefined;
};

export type Project = {
  id: `prj_${string}`;
  slug: string;
  config: ResolvedConfig & { pluginsUrl?: string; scorecardClassic?: ResolvedConfig['scorecard'] };
};
