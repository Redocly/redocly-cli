import type { VerifyConfigOptions } from '../../types.js';
import type { NormalizedProblem, ResolvedConfig } from '@redocly/openapi-core';

export type ScorecardClassicArgv = {
  api: string;
  config: string;
  'project-url'?: string;
} & VerifyConfigOptions;

export type ScorecardProblem = NormalizedProblem & { scorecardLevel?: string };

export type RemoteScorecardAndPlugins = {
  scorecard: ResolvedConfig['scorecard'];
  plugins: string | undefined;
};

export type Organization = {
  id: `org_${string}`;
  slug: string;
};

export type Project = {
  id: `prj_${string}`;
  slug: string;
  config: ResolvedConfig & { pluginsUrl?: string; scorecardClassic?: ResolvedConfig['scorecard'] };
};

export type PaginatedList<T> = {
  items: T[];
};
