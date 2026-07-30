import { BaseResolver, bundle, isPlainObject, logger, type Config } from '@redocly/openapi-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import type { CommandArgs } from '../../wrapper.js';
import { selectTrafficParser } from '../drift/log-formats/registry.js';
import {
  detectOpenApi3Spec,
  isHttpMethod,
  loadOpenApiIndex,
  resolveSpecFiles,
} from '../drift/openapi/loader.js';
import { matchOperation } from '../drift/openapi/matcher.js';
import type { MatchMode, TrafficFormat } from '../drift/types/index.js';
import { listFilesRecursively, normalizeFsPath } from '../drift/utils/files.js';
import { pickSchemaByMime } from '../drift/utils/http.js';
import { summarize } from './engine/analyse.js';
import { resolve, type Schema } from './engine/schema.js';
import { createCoverage, walkRoot } from './engine/walk.js';
import { renderCoverage, type CoverageFormat } from './reporter.js';

export type CoverageArgv = {
  traffic: string;
  api: string;
  'traffic-format': TrafficFormat;
  format: CoverageFormat;
  'match-mode'?: MatchMode;
  schema?: string;
  all?: boolean;
  output?: string;
} & VerifyConfigOptions;

/**
 * A bundled description that still carries `$ref`s.
 *
 * `drift`'s index cannot serve here: it bundles with `dereference: true`, which
 * deep-clones every target, so a value's schema can no longer be traced back to
 * the component it came from — and coverage is reported per component.
 */
async function loadReferencedSpec(specPath: string, config: Config): Promise<Schema> {
  const { specFiles } = await resolveSpecFiles(specPath);
  const externalRefResolver = new BaseResolver(config.resolve);
  const roots: { file: string; parsed: Schema }[] = [];

  for (const specFile of specFiles) {
    const resolvedDocument = await externalRefResolver.resolveDocument(null, specFile, true);
    // A folder holds the files a root description references as well, and only
    // the roots describe operations.
    if (resolvedDocument instanceof Error || !detectOpenApi3Spec(resolvedDocument)) continue;

    const { bundle: bundled } = await bundle({
      config,
      doc: resolvedDocument,
      externalRefResolver,
      dereference: false,
    });
    roots.push({ file: specFile, parsed: bundled.parsed as Schema });
  }

  if (roots.length === 0) {
    return exitWithError(`No OpenAPI 3.x description found at: ${specPath}`);
  }

  if (roots.length > 1) {
    return exitWithError(
      `Coverage measures one description at a time, but ${specPath} holds several:\n` +
        roots.map(({ file }) => `  ${normalizeFsPath(file)}`).join('\n') +
        '\nPoint --api at one of them.'
    );
  }

  return roots[0].parsed;
}

async function writeReport(output: string, content: string): Promise<void> {
  const resolved = normalizeFsPath(output);

  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
}

function operationKey(method: string, pathTemplate: string): string {
  return `${method.toLowerCase()} ${pathTemplate}`;
}

/** Request and response body schemas per operation, keyed by method and path. */
function collectSchemas(spec: Schema): Map<string, { request?: Schema; responses: Schema }> {
  const byOperation = new Map<string, { request?: Schema; responses: Schema }>();

  for (const [pathTemplate, item] of Object.entries(spec.paths ?? {}) as [string, Schema][]) {
    const { schema: pathItem } = resolve(spec, item);
    if (!pathItem) continue;

    for (const [method, operation] of Object.entries(pathItem) as [string, Schema][]) {
      if (!isHttpMethod(method) || !isPlainObject(operation)) continue;

      const { requestBody, responses } = operation as Schema;
      byOperation.set(operationKey(method, pathTemplate), {
        request: requestBody,
        responses: responses ?? {},
      });
    }
  }

  return byOperation;
}

/**
 * The schema describing a body, selected the same way `drift` selects it:
 * exact status, then the `2XX` class, then `default`, and the content entry by
 * mime with wildcard fallbacks.
 */
function bodySchema(
  spec: Schema,
  holder: Schema | undefined,
  contentType: string | undefined
): Schema | undefined {
  const { schema: resolved } = resolve(spec, holder);
  const content = resolved?.content;

  return content ? (pickSchemaByMime(content, contentType) as Schema | undefined)?.schema : undefined;
}

function responseHolder(responses: Schema, status: number | undefined): Schema | undefined {
  if (status === undefined) return responses.default;

  const statusClass = `${Math.floor(status / 100)}XX`;

  // `drift` accepts the lowercase form too, and the two have to agree on which
  // schema describes a response.
  return (
    responses[String(status)] ??
    responses[statusClass] ??
    responses[statusClass.toLowerCase()] ??
    responses.default
  );
}

export async function handleCoverage({ argv, config }: CommandArgs<CoverageArgv>): Promise<void> {
  const trafficFiles = await listFilesRecursively(argv.traffic);
  if (trafficFiles.length === 0) {
    return exitWithError('No traffic files found in the provided traffic path.');
  }

  const index = await loadOpenApiIndex(argv.api, config);
  const spec = await loadReferencedSpec(argv.api, config);
  const schemasByOperation = collectSchemas(spec);

  const coverage = createCoverage();
  const acceptedCoverage = createCoverage();
  const exercisedOperations = new Set<string>();
  let exchangeIndex = 0;
  let walked = 0;

  for (const trafficFile of trafficFiles) {
    const parser = await selectTrafficParser(trafficFile, argv['traffic-format']);
    if (!parser) {
      logger.warn(`Skipping traffic file with unrecognized format: ${trafficFile}\n`);
      continue;
    }

    for await (const parsed of parser.parse(trafficFile)) {
      const exchange = { ...parsed, index: exchangeIndex };
      exchangeIndex += 1;

      const matched = matchOperation(index, exchange, argv['match-mode'] ?? 'strict-host');
      if (!matched) continue;

      const key = operationKey(matched.operation.method, matched.operation.pathTemplate);
      exercisedOperations.add(key);

      const entry = schemasByOperation.get(key);
      if (!entry) continue;

      const status = exchange.response?.status;
      const accepted = status !== undefined && status >= 200 && status < 300;

      const pairs: [Schema | undefined, unknown][] = [
        [
          bodySchema(spec, responseHolder(entry.responses, exchange.response?.status), exchange.response?.contentType),
          exchange.response?.bodyJson,
        ],
        [bodySchema(spec, entry.request, exchange.request.contentType), exchange.request.bodyJson],
      ];

      let used = false;
      for (const [schema, value] of pairs) {
        if (!schema || value === undefined) continue;

        used = true;
        walkRoot(spec, coverage, schema, value);
        // Tracked a second time so the report can say how much of the figure
        // rests on exchanges the API accepted.
        if (accepted) walkRoot(spec, acceptedCoverage, schema, value);
      }

      if (used) walked += 1;
    }
  }

  if (exchangeIndex === 0) {
    return exitWithError('No HTTP exchanges were parsed from the provided traffic files.');
  }

  const report = summarize(
    spec,
    coverage,
    { total: exchangeIndex, withBody: walked },
    argv.schema,
    exercisedOperations,
    summarize(spec, acceptedCoverage, { total: exchangeIndex, withBody: walked }, argv.schema)
      .seenProperties
  );
  const rendered = renderCoverage(report, { format: argv.format, all: Boolean(argv.all) });

  if (argv.output) {
    await writeReport(argv.output, rendered);
    logger.info(`Coverage report written to: ${normalizeFsPath(argv.output)}\n`);
    return;
  }

  logger.output(rendered);
}
