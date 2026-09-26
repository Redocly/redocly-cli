export interface BreakdownStats {
  errors: number;
  warnings: number;
  info: number;
  total: number;
}

export type RuleBreakdown = Record<string, BreakdownStats>;

export interface Summary {
  filesScanned: number;
  totalIssues: number;
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
  breakdown: RuleBreakdown;
  /** Present only when a baseline is active. */
  baseline?: BaselineStats;
}

export interface BaselineStats {
  matched: number;
  new: number;
  stale: number;
}
