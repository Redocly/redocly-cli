import * as yaml from 'js-yaml';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { extractStatics, type RawMarkdocTagMap } from '../parser/markdoc/extract-statics.js';
import type { MarkdocTagSchema } from '../parser/markdoc/schema.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type { Logger } from './logger.js';

export interface MarkdocSchemaOptions {
  from: string[];
  out: string;
  check?: boolean;
}

/** One `--from` module's extracted tags, alongside the argument the user typed for it (used in every message and the regenerate header — never the resolved path, which is a per-machine detail). */
interface ExtractedModule {
  source: string;
  tags: Record<string, MarkdocTagSchema>;
}

/**
 * Dynamic-imports one `--from` module, resolved relative to `cwd`, and pulls
 * its tags map. The two real project schema modules this command targets
 * (docs/realm, docs/intranet) export a default object carrying `tags` rather
 * than a named export, so both forms are accepted.
 *
 * An import failure is rethrown as one actionable line rather than a raw
 * stack trace: the overwhelmingly likely cause is a TypeScript source file
 * handed to plain Node, which has no way to run it.
 */
async function loadModuleTags(fromArg: string, cwd: string): Promise<RawMarkdocTagMap> {
  const resolvedUrl = pathToFileURL(path.resolve(cwd, fromArg)).href;

  let imported: Record<string, unknown>;
  try {
    imported = (await import(resolvedUrl)) as Record<string, unknown>;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `could not import "${fromArg}" — TypeScript sources need a loader, e.g.: ` +
        `pnpm exec tsx node_modules/.bin/recheck --generate-markdoc-schema … (${detail})`
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
 * Merges each module's extracted statics in command-line order, tolerating an
 * identical duplicate (deep-equal via JSON.stringify — extracted statics are
 * plain data by construction, so this is a faithful equality check) but
 * rejecting a genuine conflict. Two `--from` modules disagreeing about one
 * tag's shape means at least one of them is wrong about that tag, so this
 * picks neither rather than silently letting command-line order decide.
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

/** Renders the `markdoc.extend.tagsFile` YAML: a flat tag-name -> MarkdocTagSchema map, no wrapping `tags:` key — that's the shape `config/validate.ts`'s `loadMarkdocTagsFile` reads. */
function renderYaml(
  merged: Record<string, MarkdocTagSchema>,
  fromArgs: string[],
  outArg: string
): string {
  const fromFlags = fromArgs.map((fromArg) => `--from ${fromArg}`).join(' ');
  const header =
    `# Generated file — do not hand-edit.\n` +
    `# Source module(s): ${fromArgs.join(', ')}\n` +
    `# Regenerate: recheck --generate-markdoc-schema ${fromFlags} --out ${outArg}\n`;
  return header + yaml.dump(merged, { sortKeys: true });
}

/**
 * Generates a `markdoc.extend.tagsFile` YAML file (tag-name -> MarkdocTagSchema)
 * from one or more project schema modules, so a project's own custom Markdoc
 * tags get the same static value-checking recheck's built-in `realm` schema
 * gets. Each module is extracted in isolation — empty base maps passed to
 * `extractStatics` — so the file it produces carries ONLY that project's own
 * tags, never built-ins; those come from `schema: 'realm'` at lint time
 * instead, and layering them in here would make them impossible to tell
 * apart from a project's real customizations.
 */
export async function generateMarkdocSchema(
  options: MarkdocSchemaOptions,
  logger: Logger
): Promise<number> {
  const cwd = process.cwd();
  const modules: ExtractedModule[] = [];

  for (const fromArg of options.from) {
    try {
      const rawTags = await loadModuleTags(fromArg, cwd);
      const { tags } = extractStatics(rawTags, {}, {});
      modules.push({ source: fromArg, tags });
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  const { merged, conflicts } = mergeExtracted(modules);
  if (conflicts.length > 0) {
    for (const conflict of conflicts) {
      logger.error(`redocly recheck --generate-markdoc-schema: ${conflict}`);
    }
    return 1;
  }

  const rendered = renderYaml(merged, options.from, options.out);
  const outPath = path.resolve(cwd, options.out);

  if (options.check) {
    const onDisk = await readFile(outPath, 'utf8').catch(() => null);
    if (onDisk !== rendered) {
      logger.error(
        onDisk === null
          ? `${outPath} does not exist — run \`recheck --generate-markdoc-schema\` without --check to create it.`
          : `${outPath} is stale — run \`recheck --generate-markdoc-schema\` to regenerate it.`
      );
      return 1;
    }
    logger.log(`${outPath} is up to date.`);
    return 0;
  }

  try {
    await writeFile(outPath, rendered, 'utf8');
  } catch (error) {
    // A typo'd --out path should read as a one-line diagnosis, not a stack
    // trace; creating missing directories silently would mask the typo.
    const detail = error instanceof Error ? error.message : String(error);
    logger.error(
      `redocly recheck --generate-markdoc-schema: could not write ${outPath} — ${detail}`
    );
    return 1;
  }
  logger.log(`Wrote ${outPath}`);
  return 0;
}
