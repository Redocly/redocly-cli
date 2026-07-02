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
} from '@redocly/openapi-core';
import { performance } from 'perf_hooks';

import type { VerifyConfigOptions } from '../../types.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { printStats } from './print-stats/index.js';
import { resolveStatsVisitorAndAccumulator } from './visitor-and-accumulator-resolver.js';

export type StatsArgv = {
  api?: string;
  format: OutputFormat;
} & VerifyConfigOptions;

export async function handleStats({ argv, config, collectSpecData }: CommandArgs<StatsArgv>) {
  const [{ path }] = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const { bundle: document } = await bundle({ config, ref: path });
  collectSpecData?.(document.parsed);
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
