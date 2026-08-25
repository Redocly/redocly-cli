import {
  type CodeSample,
  type Generator,
  groupSlug,
  type OperationModel,
  type SampleContext,
} from '@redocly/client-generator';
import { join } from 'node:path';

import { renderCliDocs } from './docs.ts';
import { cliRuntimeSource } from './engine-source.ts';
import { cliAuthSchemes, commandData, renderCliModule } from './render.ts';

/**
 * The cli generator: a bin-ready `<stem>.cli.ts` — a zero-dependency, typed
 * command-line interface over the sibling client (typed flags, `--json`
 * bodies, env auth, `--page-all`, SSE/blob output, a documented exit-code
 * contract). Requires `typescript` (throw mode); wires zod validation when co-selected.
 */
export const cliGenerator: Generator = ({ model, output, banner, emit, selected, pagination }) => {
  const content = renderCliModule(model, {
    stem: output.stem,
    importExt: emit.importExt ?? 'js',
    zodSelected: selected?.includes('zod') ?? false,
    pagination,
    argsStyle: emit.argsStyle ?? 'grouped',
    runtime: emit.runtime ?? 'inline',
  });
  const entry = { path: join(output.dir, `${output.stem}.cli.ts`), content };
  if (emit.runtime !== 'module') return [entry];
  const header = banner.map((line) => `// ${line}`).join('\n');
  return [
    entry,
    {
      path: join(output.dir, 'runtime', 'cli.ts'),
      content: `${header}\n\n${cliRuntimeSource().trim()}\n`,
    },
  ];
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
