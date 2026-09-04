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

export type OutputFormat = 'table' | 'json' | 'sarif' | 'github-actions';

export interface ReportOptions {
  format: OutputFormat;
  showStats?: boolean;
  annotationsLimit?: number;
  outputPath?: string;
  /** Present only when a baseline is active; the json format serializes it. */
  baseline?: BaselineStats;
}
