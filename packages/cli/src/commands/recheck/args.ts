import type { VerifyConfigOptions } from '../../types.js';

export type RecheckFormat = 'table' | 'json' | 'sarif' | 'github-actions';

export type RecheckArgv = {
  paths?: string[];
  format: RecheckFormat;
  'output-path'?: string;
  severity?: 'off' | 'info' | 'warn' | 'warning' | 'error';
  tags?: string[];
  rule?: string[];
  'exclude-rule'?: string[];
  stats?: boolean;
  fix?: boolean;
  'annotations-limit'?: number;
  summary?: 'json' | 'text';
  'summary-path'?: string;
  'changed-only'?: boolean;
  'changed-list'?: string;
  readability?: boolean;
  'generate-baseline'?: boolean;
  'generate-markdoc-schema'?: boolean;
  from?: string[];
  out?: string;
  check?: boolean;
} & VerifyConfigOptions;

export type RecheckAction = 'lint' | 'readability' | 'baseline' | 'markdoc-schema';

export function selectAction(argv: RecheckArgv): { action: RecheckAction } | { error: string } {
  const flags: RecheckAction[] = [];
  if (argv.readability) flags.push('readability');
  if (argv['generate-baseline']) flags.push('baseline');
  if (argv['generate-markdoc-schema']) flags.push('markdoc-schema');
  if (flags.length > 1) {
    return {
      error: 'Use one of --readability, --generate-baseline, or --generate-markdoc-schema.',
    };
  }
  const action = flags[0] ?? 'lint';
  if (argv.fix && action !== 'lint') return { error: '--fix applies to linting only.' };
  if (action === 'readability' && argv.format !== 'table' && argv.format !== 'json') {
    return { error: '--readability supports --format table or json.' };
  }
  if (action === 'markdoc-schema' && ((argv.from ?? []).length === 0 || !argv.out)) {
    return { error: '--generate-markdoc-schema requires --from and --out.' };
  }
  return { action };
}
