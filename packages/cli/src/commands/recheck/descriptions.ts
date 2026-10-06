import {
  detectSpec,
  getTypes,
  isAbsoluteUrl,
  isPlainObject,
  isSupportedExtension,
  logger,
  normalizeTypes,
  normalizeVisitors,
  ResolveError,
  resolveDocument,
  walkDocument,
  YamlParseError,
  type BaseResolver,
  type Config,
  type Oas3Visitor,
  type Source,
} from '@redocly/openapi-core';
import type { EmbeddedInput } from '@redocly/recheck';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

import { createPositionMapper } from './positions.js';

interface CollectedDescription {
  source: Source;
  pointer: string;
  text: string;
}

interface WalkedApi {
  descriptions: CollectedDescription[];
  // Absolute paths of the root document and every local $ref file it read.
  files: string[];
  // One message for each local $ref whose pointer is missing in a file that loaded.
  unresolvedPointers: string[];
}

export interface EmbeddedInputs {
  inputs: EmbeddedInput[];
  failureCount: number;
  apiFiles: string[];
  unreadableFiles: string[];
}

// A YAML or JSON file that cannot be read or parsed counts as an API description:
// the run must fail for it instead of linting it as Markdown.
// The resolver keeps the parsed file, so the walk does not read it again.
export async function isApiDescription(path: string, resolver: BaseResolver): Promise<boolean> {
  if (!isSupportedExtension(path.toLowerCase())) return false;
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) return false;
  try {
    const document = await resolver.resolveDocument(null, path, true);
    if (document instanceof Error) throw document;
    detectSpec(document.parsed);
    return true;
  } catch (error) {
    return error instanceof ResolveError || error instanceof YamlParseError;
  }
}

// Walks one API document, external $ref files included, and returns every
// string `description` with the file that owns it. `summary` stays out.
// `seen` holds the descriptions of earlier APIs, so a shared file is collected once.
async function walkApi(
  apiPath: string,
  config: Config,
  resolver: BaseResolver,
  seen: Set<string>
): Promise<WalkedApi> {
  const document = await resolver.resolveDocument(null, apiPath, true);
  if (document instanceof Error) throw document;
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver: resolver,
  });

  const descriptions: CollectedDescription[] = [];
  const files = new Set<string>([document.source.absoluteRef]);
  // The same $ref can occur at many places, so each message is kept once.
  const unresolvedPointers = new Set<string>();
  const brokenRefs = new Set<string>();
  const visitor: Oas3Visitor = {
    any: {
      enter(node, ctx) {
        if (!isPlainObject(node) || typeof node.description !== 'string') return;
        const location = ctx.location.child('description');
        if (seen.has(location.absolutePointer)) return;
        seen.add(location.absolutePointer);
        descriptions.push({
          source: location.source,
          pointer: location.pointer,
          text: node.description,
        });
      },
    },
    // The walk skips a $ref that does not resolve, so this hook records it.
    ref: {
      enter(node, ctx, resolved) {
        const ref = node.$ref;
        const sourceFile = ctx.location.source.absoluteRef;
        if (isAbsoluteUrl(sourceFile) || isAbsoluteUrl(ref)) return;
        if (resolved.error !== undefined) {
          brokenRefs.add(
            `Could not resolve $ref ${ref} from ${sourceFile}: ${resolved.error.message}`
          );
          return;
        }
        // A missing pointer keeps the location of its file. Only an unknown $ref has none.
        if (resolved.location === undefined) return;
        // A local $ref can chain into a remote file, which is not linted.
        const targetFile = resolved.location.source.absoluteRef;
        if (!isAbsoluteUrl(targetFile)) files.add(targetFile);
        if (resolved.node === undefined) {
          // For a $ref to another file, the warning names the file with the missing pointer.
          // In a $ref chain, that file is the last hop, not the file that `ref` names.
          let missingIn = '';
          if (targetFile !== sourceFile) missingIn = `: a pointer is missing in ${targetFile}`;
          unresolvedPointers.add(
            `Could not resolve $ref ${ref} from ${sourceFile}${missingIn}; its descriptions are skipped.`
          );
        }
      },
    },
  };
  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizeVisitors(
      [{ ruleId: 'recheck/descriptions', severity: 'error', visitor }],
      types
    ),
    resolvedRefMap,
    ctx: { problems: [], specVersion, visitorsData: {} },
  });

  if (brokenRefs.size > 0) throw new Error([...brokenRefs].join('\n'));
  return { descriptions, files: [...files], unresolvedPointers: [...unresolvedPointers] };
}

// A remote API or a description in a remote `$ref` file is skipped:
// baseline keys and the changed-file filter need a local path.
export async function collectEmbeddedInputs(
  apiPaths: string[],
  config: Config,
  resolver: BaseResolver
): Promise<EmbeddedInputs> {
  const inputs: EmbeddedInput[] = [];
  const seen = new Set<string>();
  const apiFiles = new Set<string>();
  const failedFiles = new Set<string>();
  let failureCount = 0;
  let remoteSkipped = 0;
  for (const apiPath of apiPaths) {
    if (isAbsoluteUrl(apiPath)) {
      logger.info(`Skipped remote API description ${apiPath}; only local files are linted.\n`);
      continue;
    }

    const filesBefore = resolver.getFiles();
    let walked: WalkedApi;
    try {
      walked = await walkApi(apiPath, config, resolver, seen);
    } catch (error) {
      logger.error(
        `Could not read API description ${apiPath}: ${error instanceof Error ? error.message : String(error)}\n`
      );
      failureCount++;
      // No description of a failed API is linted, so every local file the
      // resolver read, or tried to read, for it keeps its baseline entries.
      failedFiles.add(resolve(apiPath));
      for (const file of resolver.getFiles()) {
        if (!filesBefore.has(file) && !isAbsoluteUrl(file)) failedFiles.add(file);
      }
      continue;
    }

    for (const message of walked.unresolvedPointers) {
      logger.warn(`${message}\n`);
    }
    for (const file of walked.files) {
      apiFiles.add(file);
    }
    for (const { source, pointer, text } of walked.descriptions) {
      if (isAbsoluteUrl(source.absoluteRef)) {
        remoteSkipped++;
        continue;
      }
      inputs.push({
        file: source.absoluteRef,
        pointer,
        content: text,
        mapPosition: createPositionMapper(source, pointer),
      });
    }
  }

  if (remoteSkipped > 0) {
    logger.info(
      `Skipped ${remoteSkipped} description(s) in remote $ref files; only local files are linted.\n`
    );
  }

  // A file that one API could not reach through a `$ref`, but another API read,
  // is scanned, not unreadable. Its baseline entries still apply.
  const unreadableFiles: string[] = [];
  for (const file of failedFiles) {
    if (!apiFiles.has(file)) unreadableFiles.push(file);
  }
  return { inputs, failureCount, apiFiles: [...apiFiles], unreadableFiles };
}
