import type { VerifyConfigOptions } from '../../types.js';

export type RecheckFormat = 'table' | 'json' | 'sarif' | 'github-actions';

export type RecheckArgv = {
  paths?: string[];
  format: RecheckFormat;
  tags?: string[];
  rule?: string[];
  'skip-rule'?: string[];
  stats?: boolean;
  fix?: boolean;
  'max-problems'?: number;
  summary?: 'json' | 'text';
  'summary-path'?: string;
  readability?: boolean;
  'generate-baseline'?: boolean;
  'generate-markdoc-schema'?: boolean;
  from?: string[];
  output?: string;
  check?: boolean;
} & VerifyConfigOptions;

export type RecheckAction = 'lint' | 'readability' | 'baseline' | 'markdoc-schema';
