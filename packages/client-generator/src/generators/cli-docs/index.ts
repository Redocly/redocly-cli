import { join } from 'node:path';

import { renderCliDocs } from '../../emitters/cli-docs.js';
import { cliAuthSchemes, commandData } from '../../emitters/cli.js';
import { anchor } from '../anchor.js';
import type { Generator, GeneratorOptionsSchema } from '../types.js';

/**
 * The cli-docs generator: `<stem>.cli.md`, the Markdown reference for the generated CLI —
 * usage, global flags, credential variables, exit codes, and every command with its
 * positionals and flags. It renders from the same command table the CLI dispatches on, so
 * the page cannot drift from the tool it documents.
 */
export const cliDocsOptions: GeneratorOptionsSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Page heading. Defaults to "<API title> command-line reference".',
    },
    frontmatter: {
      type: 'boolean',
      default: false,
      description: 'Emit YAML front matter carrying the title, for docs sites that expect it.',
    },
  },
  additionalProperties: false,
};

/** The stem as a command name — the same fold the cli generator applies. */
function commandName(stem: string): string {
  return (
    stem
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'client'
  );
}

export const cliDocsGenerator: Generator = ({ model, outputPath, emit, options }) => {
  const { dir, stem } = anchor(outputPath);
  const content = renderCliDocs(commandData(model, { pagination: emit.pagination }), {
    title: (options?.title as string | undefined) ?? `${model.title} command-line reference`,
    frontmatter: options?.frontmatter === true,
    binName: emit.binName ?? commandName(stem),
    schemes: cliAuthSchemes(model),
  });
  return [{ path: join(dir, `${stem}.cli.md`), content }];
};
