import {
  detectSpec,
  getTypes,
  isAbsoluteUrl,
  isPlainObject,
  isSupportedExtension,
  logger,
  normalizeTypes,
  normalizeVisitors,
  parseRef,
  resolveDocument,
  walkDocument,
  YamlParseError,
  type BaseResolver,
  type Config,
  type Oas3Visitor,
  type Source,
} from '@redocly/openapi-core';
import type { EmbeddedInput } from '@redocly/recheck';
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
  // One message for each local $ref whose target file could not be read or parsed,
  // and the absolute paths of those files.
  brokenRefs: string[];
  brokenFiles: string[];
}

export interface EmbeddedInputs {
  inputs: EmbeddedInput[];
  failureCount: number;
  apiFiles: string[];
  unreadableFiles: string[];
}

// A YAML or JSON file that does not parse counts as an API description:
// the run must fail for it instead of linting it as Markdown.
// The resolver keeps the parsed file, so the walk does not read it again.
export async function isApiDescription(path: string, resolver: BaseResolver): Promise<boolean> {
  if (!isSupportedExtension(path)) return false;
  try {
    const document = await resolver.resolveDocument(null, path, true);
    if (document instanceof Error) throw document;
    detectSpec(document.parsed);
    return true;
  } catch (error) {
    return error instanceof YamlParseError;
  }
}

// Walks one API document, external $ref files included, and returns every
// string `description` with the file that owns it. `summary` stays out.
async function walkApi(
  apiPath: string,
  config: Config,
  resolver: BaseResolver
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
  const brokenFiles = new Set<string>();
  const visitor: Oas3Visitor = {
    any: {
      enter(node, ctx) {
        if (!isPlainObject(node) || typeof node.description !== 'string') return;
        const location = ctx.location.child('description');
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
          const { uri } = parseRef(ref);
          if (uri !== null) brokenFiles.add(resolver.resolveExternalRef(sourceFile, uri));
          return;
        }
        // A missing pointer keeps the location of its file; only an unknown $ref has none.
        if (resolved.location === undefined) return;
        files.add(resolved.location.source.absoluteRef);
        if (resolved.node === undefined) {
          unresolvedPointers.add(
            `Could not resolve $ref ${ref} from ${sourceFile}; its descriptions are skipped.`
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

  return {
    descriptions,
    files: [...files],
    unresolvedPointers: [...unresolvedPointers],
    brokenRefs: [...brokenRefs],
    brokenFiles: [...brokenFiles],
  };
}

// Two APIs may `$ref` the same file, so a description is collected once across all APIs.
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
  const failedFiles: string[] = [];
  let failureCount = 0;
  let remoteSkipped = 0;
  for (const apiPath of apiPaths) {
    if (isAbsoluteUrl(apiPath)) {
      logger.info(`Skipped remote API description ${apiPath}; only local files are linted.\n`);
      continue;
    }

    let walked: WalkedApi;
    try {
      walked = await walkApi(apiPath, config, resolver);
    } catch (error) {
      logger.error(
        `Could not read API description ${apiPath}: ${error instanceof Error ? error.message : String(error)}\n`
      );
      failureCount++;
      failedFiles.push(resolve(apiPath));
      continue;
    }
    if (walked.brokenRefs.length > 0) {
      logger.error(`Could not read API description ${apiPath}: ${walked.brokenRefs.join('\n')}\n`);
      failureCount++;
      failedFiles.push(resolve(apiPath), ...walked.brokenFiles);
      continue;
    }

    for (const message of walked.unresolvedPointers) {
      logger.warn(`${message}\n`);
    }
    for (const file of walked.files) {
      apiFiles.add(file);
    }
    for (const { source, pointer, text } of walked.descriptions) {
      const key = `${source.absoluteRef}${pointer}`;
      if (seen.has(key)) continue;
      seen.add(key);
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
