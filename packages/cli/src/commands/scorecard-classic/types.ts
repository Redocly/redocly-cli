import type { ScorecardConfig } from '@redocly/config';
import type { NormalizedProblem, OutputFormat, ResolvedConfig } from '@redocly/openapi-core';

export type ScorecardClassicOutputFormat =
  | Extract<OutputFormat, 'stylish' | 'json' | 'checkstyle'>
  | 'junit';

export type ScorecardClassicArgv = {
  api: string;
  config: string;
  'project-url'?: string;
  format: ScorecardClassicOutputFormat;
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
  organizationId: `org_${string}`;
  slug: string;
};

export type ProjectConfig = {
  id: `prj_${string}`;
  projectId: `prj_${string}`;
  organizationId: `org_${string}`;
  config: (ResolvedConfig & { pluginsUrl?: string; scorecardClassic?: ScorecardConfig }) | null;
};
