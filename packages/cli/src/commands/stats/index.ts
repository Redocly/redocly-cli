import {
  normalizeTypes,
  BaseResolver,
  resolveDocument,
  detectSpec,
  getTypes,
  normalizeVisitors,
  walkDocument,
  bundle,
  type WalkContext,
  type OutputFormat,
  HandledError,
  logger,
  type Config,
} from '@redocly/openapi-core';
import { cyan } from 'colorette';
import { performance } from 'perf_hooks';

import { renderBanner } from '../../utils/banner.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { printStats } from './print-stats/index.js';
import { resolveStatsVisitorAndAccumulator } from './visitor-and-accumulator-resolver.js';

export type StatsArgv = {
  api?: string;
  format: OutputFormat;
};

export async function handleStats({ argv, config, collectSpecData }: CommandArgs<StatsArgv>) {
  // FIXME: replace this line with `const { api } = argv;` when `getDeprecatedFirstApi` goes.
  // The first API stays out of `argv`, so the usage data shows that the run had no API argument.
  const api = argv.api ?? getDeprecatedFirstApi(config);
  if (api === undefined) {
    throw new HandledError('No API to process. Pass an API to the command: `redocly stats <api>`.');
  }
  const [{ path }] = await getFallbackApisOrExit([api], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const { bundle: document } = await bundle({ config, ref: path });
  collectSpecData?.(document);
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);

  const { statsVisitor, statsAccumulator } = resolveStatsVisitorAndAccumulator(specVersion);

  const startedAt = performance.now();
  const ctx: WalkContext = {
    problems: [],
    specVersion,
    config,
    visitorsData: {},
  };

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  const normalizedStatsVisitor = normalizeVisitors(
    [
      {
        severity: 'warn',
        ruleId: 'stats',
        visitor: statsVisitor,
      },
    ],
    types
  );

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizedStatsVisitor,
    resolvedRefMap,
    ctx,
  });

  printStats(statsAccumulator, path, startedAt, argv.format);
}

// FIXME: remove this function when the deprecation period ends, a week to a month after the release.
// Before, `stats` without an API took the first API of the configuration file.
// Such a run now fails, because the command processes one API, which the command line names.
// Until then, it gets the first API as its `api` argument and a deprecation banner.
// `build-docs`, `stats`, `score`, and `scorecard-classic` each hold a copy of this function.
function getDeprecatedFirstApi(config: Config): string | undefined {
  const [firstApi] = Object.keys(config.resolvedConfig.apis ?? {});
  if (firstApi !== undefined) {
    logger.info(
      renderBanner([
        'Deprecated: stats without an API takes the first API of the configuration file.',
        'A later release requires the API.',
        `Pass the API: ${cyan('redocly stats <api>')}`,
      ])
    );
  }
  return firstApi;
}
