import * as yaml from 'js-yaml';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { extractStatics, type RawMarkdocTagMap } from '../parser/markdoc/extract-statics.js';
import type { MarkdocTagSchema } from '../parser/markdoc/schema.js';
import { isPlainObject } from '../utils/is-plain-object.js';

export interface MarkdocSchemaOptions {
  from: string[];
  out: string;
  check?: boolean;
}

export type MarkdocSchemaResult =
  | { status: 'written'; outPath: string }
  | { status: 'up-to-date'; outPath: string }
  | { status: 'missing'; outPath: string }
  | { status: 'stale'; outPath: string }
  | { status: 'conflicts'; conflicts: string[] }
  | { status: 'load-error'; message: string }
  | { status: 'write-error'; outPath: string; message: string };

// `source` is the `--from` argument as typed, not the resolved path, so messages and the header are the same on every machine.
interface ExtractedModule {
  source: string;
  tags: Record<string, MarkdocTagSchema>;
}

/**
 * Imports one `--from` module and returns its tags. Accepts a named `tags` export
 * or a default export with `tags`. If the import fails, throws a short message:
 * the usual cause is a TypeScript file that Node cannot run.
 */
async function loadModuleTags(fromArg: string, cwd: string): Promise<RawMarkdocTagMap> {
  const resolvedUrl = pathToFileURL(path.resolve(cwd, fromArg)).href;

  let imported: Record<string, unknown>;
  try {
    imported = (await import(resolvedUrl)) as Record<string, unknown>;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `could not import "${fromArg}". Compile it to JavaScript first, or run the CLI ` +
        `under a TypeScript loader such as tsx. (${detail})`
    );
  }

  const namedTags = imported.tags as RawMarkdocTagMap | undefined;
  const defaultTags = (imported.default as { tags?: RawMarkdocTagMap } | undefined)?.tags;
  const tags = namedTags ?? defaultTags;
  if (!isPlainObject<RawMarkdocTagMap>(tags)) {
    throw new Error(
      `"${fromArg}" has no "tags" export — expected a named "tags" export or a default ` +
        `export with a "tags" property`
    );
  }
  return tags;
}

/**
 * Merges the tags of all modules. A tag defined twice with the same shape is fine.
 * A tag defined twice with different shapes is a conflict, and neither one wins.
 */
function mergeExtracted(modules: ExtractedModule[]): {
  merged: Record<string, MarkdocTagSchema>;
  conflicts: string[];
} {
  const merged: Record<string, MarkdocTagSchema> = {};
  const owner: Record<string, string> = {};
  const conflicts: string[] = [];

  for (const { source, tags } of modules) {
    for (const [tagName, tagSchema] of Object.entries(tags)) {
      if (!(tagName in merged)) {
        merged[tagName] = tagSchema;
        owner[tagName] = source;
        continue;
      }
      if (JSON.stringify(merged[tagName]) !== JSON.stringify(tagSchema)) {
        conflicts.push(`tag "${tagName}" differs between "${owner[tagName]}" and "${source}"`);
      }
    }
  }

  return { merged, conflicts };
}

// Renders the YAML for `markdoc.extend.tagsFile`: a flat map of tag name to schema, with no top-level `tags:` key.
function renderYaml(
  merged: Record<string, MarkdocTagSchema>,
  fromArgs: string[],
  outArg: string
): string {
  const fromFlags = fromArgs.map((fromArg) => `--from ${fromArg}`).join(' ');
  const header =
    `# Generated file — do not hand-edit.\n` +
    `# Source module(s): ${fromArgs.join(', ')}\n` +
    `# Regenerate: redocly recheck --generate-markdoc-schema ${fromFlags} --output ${outArg}\n`;
  return header + yaml.dump(merged, { sortKeys: true });
}

/**
 * Generates a `markdoc.extend.tagsFile` YAML file from one or more project schema
 * modules. The file holds only the project's own tags, not the built-in ones.
 */
export async function generateMarkdocSchema(
  options: MarkdocSchemaOptions
): Promise<MarkdocSchemaResult> {
  const cwd = process.cwd();
  const modules: ExtractedModule[] = [];

  for (const fromArg of options.from) {
    try {
      const rawTags = await loadModuleTags(fromArg, cwd);
      const { tags } = extractStatics(rawTags, {}, {});
      modules.push({ source: fromArg, tags });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { status: 'load-error', message };
    }
  }

  const { merged, conflicts } = mergeExtracted(modules);
  if (conflicts.length > 0) {
    return { status: 'conflicts', conflicts };
  }

  const rendered = renderYaml(merged, options.from, options.out);
  const outPath = path.resolve(cwd, options.out);

  if (options.check) {
    const onDisk = await readFile(outPath, 'utf8').catch(() => null);
    if (onDisk === null) {
      return { status: 'missing', outPath };
    }
    if (onDisk !== rendered) {
      return { status: 'stale', outPath };
    }
    return { status: 'up-to-date', outPath };
  }

  try {
    await writeFile(outPath, rendered, 'utf8');
  } catch (error) {
    // Missing directories are not created, so a typo in --output is reported.
    const detail = error instanceof Error ? error.message : String(error);
    return { status: 'write-error', outPath, message: detail };
  }
  return { status: 'written', outPath };
}
