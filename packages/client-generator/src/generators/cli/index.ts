import { join } from 'node:path';

import { commandData, renderCliModule } from '../../emitters/cli.js';
import type { OperationModel } from '../../intermediate-representation/model.js';
import { anchor } from '../anchor.js';
import type { CodeSample, Generator, SampleContext } from '../types.js';

/**
 * The cli generator: a bin-ready `<stem>.cli.ts` — a zero-dependency, typed
 * command-line interface over the sibling sdk client (typed flags, `--json`
 * bodies, env auth, `--page-all`, SSE/blob output, a documented exit-code
 * contract). Requires `sdk` (throw mode); wires zod validation when co-selected.
 */
export const cliGenerator: Generator = ({ model, outputPath, emit, selected }) => {
  const { dir, stem } = anchor(outputPath);
  const content = renderCliModule(model, {
    stem,
    importExt: emit.importExt ?? 'js',
    runtime: emit.runtime ?? 'inline',
    zodSelected: selected?.includes('zod') ?? false,
    binName: stem,
    pagination: emit.pagination,
  });
  return [{ path: join(dir, `${stem}.cli.ts`), content }];
};

/** One shell invocation per operation — feeds `x-codeSamples` for docs. */
export function cliSample(op: OperationModel, ctx: SampleContext): CodeSample | undefined {
  const command = commandData(ctx.model, { pagination: ctx.emit.pagination }).find(
    (candidate) => candidate.name === op.name
  );
  if (command === undefined) return undefined;
  const words = [
    'client',
    ...(command.group ? [command.group] : []),
    command.name,
    ...command.positionals.map((positional) => `<${positional.name}>`),
    ...command.flags.filter((flag) => flag.required).map((flag) => `--${flag.name} <${flag.type}>`),
    ...(command.body ? ["--json '<json>'"] : []),
  ];
  return {
    lang: 'shell',
    label: 'CLI',
    source: `npx tsx client.cli.ts ${words.slice(1).join(' ')}\n`,
  };
}
