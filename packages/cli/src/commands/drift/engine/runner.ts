import { logger } from '@redocly/openapi-core';

import { selectTrafficParser } from '../log-formats/registry.js';
import type { RunnerOptions } from '../types/index.js';
import { listFilesRecursively } from '../utils/files.js';
import { ValidationSession, type RunnerResult } from './validation-session.js';

export type { RunnerResult } from './validation-session.js';

/**
 * Stream the traffic logs, match each exchange to a documented operation, run
 * the configured rules, and accumulate findings entirely in memory.
 */
export async function runTrafficValidation(options: RunnerOptions): Promise<RunnerResult> {
  const trafficFiles = await listFilesRecursively(options.trafficPath);
  if (trafficFiles.length === 0) {
    throw new Error('No traffic files found in the provided traffic path.');
  }

  const session = ValidationSession.create({
    openApiIndex: options.openApiIndex,
    matchMode: options.matchMode,
    ignoreCookies: options.ignoreCookies,
    ignoreHeaders: options.ignoreHeaders,
    previewFindingsLimit: options.previewFindingsLimit,
    activeRules: options.activeRules,
    server: options.server,
    minSeverity: options.minSeverity,
  });

  let supportedTrafficFileCount = 0;
  let exchangeIndex = 0;

  for (const trafficFile of trafficFiles) {
    const parser = await selectTrafficParser(trafficFile, options.format);
    if (!parser) {
      logger.warn(`Skipping traffic file with unrecognized format: ${trafficFile}\n`);
      continue;
    }

    supportedTrafficFileCount += 1;

    for await (const exchange of parser.parse(trafficFile)) {
      await session.process({ ...exchange, index: exchangeIndex });
      exchangeIndex += 1;
    }
  }

  if (supportedTrafficFileCount === 0) {
    throw new Error(
      'No supported traffic files found. In auto mode, files must match built-in traffic parser signatures.'
    );
  }

  if (exchangeIndex === 0) {
    throw new Error('No HTTP exchanges were parsed from the provided traffic files.');
  }

  return session.finalize();
}
