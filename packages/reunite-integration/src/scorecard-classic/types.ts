import type { ScorecardConfig } from '@redocly/config';
import type { NormalizedProblem, ResolvedConfig } from '@redocly/openapi-core';

export type ScorecardProblem = NormalizedProblem & { scorecardLevel?: string };

export type RemoteScorecardAndPlugins = {
  scorecard: ScorecardConfig;
  plugins: string | undefined;
  pluginsUrl: string | undefined;
};

export type Project = {
  id: `prj_${string}`;
  slug: string;
  config: ResolvedConfig & { pluginsUrl?: string; scorecardClassic?: ScorecardConfig };
};
