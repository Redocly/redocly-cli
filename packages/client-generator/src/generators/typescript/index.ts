import {
  type CodeSample,
  type Generator,
  type OperationModel,
  renderReferencePage,
  type SampleContext,
} from '@redocly/client-generator';
import { join } from 'node:path';

import { emitClientSingleFile, emitClientSplit, emitRuntimeFiles } from './client-assembly.ts';
import { packageIdents } from './descriptor.ts';

/**
 * The default generator: the full typed client (model types + runtime + endpoints).
 * Other generators (zod, framework hooks) emit *additional* files alongside.
 *
 * `single` mode writes the whole client to the `--output` path. `split` mode derives
 * two sibling files from that anchor — `<stem>.schemas.ts` (model types, enums,
 * const-objects, type guards; skipped when the document declares no schemas) and
 * `<stem>.ts` (everything else, which `export *`s the schemas module).
 */
export const typescriptGenerator: Generator = ({ model, output, outputMode, emit }) => {
  // `runtime: 'module'` adds the per-needs runtime files beside the client.
  const runtime = emitRuntimeFiles(model, emit).map(({ name, content }) => ({
    path: join(output.dir, 'runtime', name),
    content,
  }));
  if (outputMode === 'split') {
    const { dir, stem } = output;
    const { entry, schemas } = emitClientSplit(model, emit, stem);
    return [
      ...(schemas === undefined
        ? []
        : [{ path: join(dir, `${stem}.schemas.ts`), content: schemas }]),
      { path: output.path, content: entry },
      ...runtime,
    ];
  }
  return [{ path: output.path, content: emitClientSingleFile(model, emit) }, ...runtime];
};

/**
 * The client's own reference page, written when `client.docs` is on. Its snippets come from
 * `typescriptSample` below, so the page shows the calling convention this run generated —
 * `argsStyle` included.
 */
export const typescriptDocs: Generator = ({ model, output, emit, pagination }) => [
  {
    path: output.path.replace(/\.[^.\\/]+$/, '.typescript.md'),
    content: renderReferencePage(model, {
      title: `${model.title} TypeScript client reference`,
      frontmatter: emit.docsFrontmatter === true,
      language: {
        name: 'typescript',
        label: 'TypeScript',
        fence: 'typescript',
        requires: 'The client has no dependencies.',
      },
      sample: (op) => typescriptSample(op, { model, emit, outputPath: output.path }),
      paginated: new Set(pagination?.keys() ?? []),
    }),
  },
];

/** One idiomatic TS call per operation, for `x-codeSamples` and the SDK reference pages. */
export function typescriptSample(op: OperationModel, ctx: SampleContext): CodeSample {
  const ident = packageIdents(ctx.model).get(op.name) ?? op.name;
  // The module this run writes, with the run's import extension — `./client` would be
  // both the wrong name for most stems and extensionless under ESM resolution.
  const stem = ctx.outputPath.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
  const specifier = `./${stem}.${ctx.emit.importExt ?? 'js'}`;
  const requiredQuery = op.queryParams.filter((param) => param.required);
  const merged = ctx.emit.argsStyle === 'flat';
  const path = op.pathParams.map((param) => `${param.name}: '<${param.name}>'`);
  const query = requiredQuery.map((param) => `${param.name}: /* … */`);
  const parts = merged
    ? [...path, ...query, ...(op.requestBody ? ['/* body properties */'] : [])]
    : [
        ...(path.length > 0 ? [`path: { ${path.join(', ')} }`] : []),
        ...(query.length > 0 ? [`query: { ${query.join(', ')} }`] : []),
        ...(op.requestBody ? ['body: { /* … */ }'] : []),
      ];
  const args = parts.length > 0 ? [`{ ${parts.join(', ')} }`] : [];
  return {
    lang: 'typescript',
    label: 'TypeScript SDK',
    source: `import { ${ident} } from '${specifier}';\n\nconst result = await ${ident}(${args.join(', ')});\n`,
  };
}
