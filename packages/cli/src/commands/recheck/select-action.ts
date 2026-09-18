import type { RecheckAction, RecheckArgv } from './types.js';

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
