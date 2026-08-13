import { join } from 'node:path';

import { emitClientSingleFile, emitClientSplit } from '../../emitters/client-assembly.js';
import { packageIdents } from '../../emitters/descriptor.js';
import type { OperationModel } from '../../intermediate-representation/model.js';
import { anchor } from '../anchor.js';
import type { CodeSample, Generator, SampleContext } from '../types.js';

/**
 * The default generator: the full typed client (model types + runtime + endpoints).
 * Other generators (zod, framework hooks) emit *additional* files alongside.
 *
 * `single` mode writes the whole client to the `--output` path. `split` mode derives
 * two sibling files from that anchor — `<stem>.schemas.ts` (model types, enums,
 * const-objects, type guards; skipped when the document declares no schemas) and
 * `<stem>.ts` (everything else, which `export *`s the schemas module).
 */
export const typescriptGenerator: Generator = ({ model, outputPath, outputMode, emit }) => {
  if (outputMode === 'split') {
    const { dir, stem } = anchor(outputPath);
    const { entry, schemas } = emitClientSplit(model, emit, stem);
    return [
      ...(schemas === undefined
        ? []
        : [{ path: join(dir, `${stem}.schemas.ts`), content: schemas }]),
      { path: outputPath, content: entry },
    ];
  }
  return [{ path: outputPath, content: emitClientSingleFile(model, emit) }];
};

/** One idiomatic TS call per operation — the `x-codeSamples` reference implementation. */
export function typescriptSample(op: OperationModel, ctx: SampleContext): CodeSample {
  const ident = packageIdents(ctx.model).get(op.name) ?? op.name;
  const requiredQuery = op.queryParams.filter((param) => param.required);
  const slots: string[] = [];
  if (requiredQuery.length > 0) {
    slots.push(
      `params: { ${requiredQuery.map((param) => `'${param.name}': /* … */`).join(', ')} }`
    );
  }
  if (op.requestBody) slots.push('body: { /* … */ }');
  const args =
    ctx.emit.argsStyle === 'grouped'
      ? op.pathParams.length + slots.length > 0
        ? [
            `{ ${[...op.pathParams.map((param) => `'${param.name}': '<${param.name}>'`), ...slots].join(', ')} }`,
          ]
        : []
      : [
          ...op.pathParams.map((param) => `'<${param.name}>'`),
          ...(slots.length > 0 ? [`{ ${slots.join(', ')} }`] : []),
        ];
  return {
    lang: 'typescript',
    label: 'TypeScript SDK',
    source: `import { ${ident} } from './client';\n\nconst result = await ${ident}(${args.join(', ')});\n`,
  };
}
