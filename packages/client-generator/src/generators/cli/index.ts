import { join } from 'node:path';

import type { OperationModel } from '../../intermediate-representation/model.js';
import type { CodeSample, Generator, SampleContext } from '../types.js';
import { renderCliDocs } from './docs.js';
import { cliAuthSchemes, commandData, renderCliModule } from './render.js';
import { groupSlug } from './runtime/cli.js';

/**
 * The cli generator: a bin-ready `<stem>.cli.ts` — a zero-dependency, typed
 * command-line interface over the sibling client (typed flags, `--json`
 * bodies, env auth, `--page-all`, SSE/blob output, a documented exit-code
 * contract). Requires `typescript` (throw mode); wires zod validation when co-selected.
 */
export const cliGenerator: Generator = ({ model, output, emit, selected, pagination }) => {
  const content = renderCliModule(model, {
    stem: output.stem,
    importExt: emit.importExt ?? 'js',
    zodSelected: selected?.includes('zod') ?? false,
    pagination,
    argsStyle: emit.argsStyle ?? 'grouped',
  });
  return [{ path: join(output.dir, `${output.stem}.cli.ts`), content }];
};

/**
 * The CLI's own reference page, written when `client.docs` is on: the usage line, the
 * global flags, the credential variables, the exit codes, and one section per command.
 * It renders from `commandData` — the same table `runCli` dispatches on — so the page
 * cannot describe a tool other than the one beside it.
 */
export const cliDocs: Generator = ({ model, output, emit, pagination }) => {
  const content = renderCliDocs(commandData(model, { pagination }), {
    title: `${model.title} command-line reference`,
    frontmatter: emit.docsFrontmatter === true,
    name: output.stem,
    schemes: cliAuthSchemes(model),
  });
  return [{ path: join(output.dir, `${output.stem}.cli.md`), content }];
};

/** One shell invocation per operation — feeds `x-codeSamples` for docs. */
export function cliSample(op: OperationModel, ctx: SampleContext): CodeSample | undefined {
  const command = commandData(ctx.model, { pagination: ctx.pagination }).find(
    (candidate) => candidate.name === op.name
  );
  if (command === undefined) return undefined;
  const words = [
    'client',
    ...(command.group ? [groupSlug(command.group)] : []),
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
