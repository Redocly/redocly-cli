import { loadTrafficParsers, selectTrafficParser } from '../log-formats/registry.js';
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

  const externalParsers = await loadTrafficParsers(options.trafficParserModules);
  const session = await ValidationSession.create({
    openApiIndex: options.openApiIndex,
    matchMode: options.matchMode,
    ignoreCookies: options.ignoreCookies,
    previewFindingsLimit: options.previewFindingsLimit,
    activeRules: options.activeRules,
    pluginModules: options.pluginModules,
  });

  let supportedTrafficFileCount = 0;
  let exchangeIndex = 0;

  for (const trafficFile of trafficFiles) {
    let parser;
    try {
      parser = await selectTrafficParser(trafficFile, options.format, externalParsers);
    } catch (error) {
      if (options.format === 'auto') {
        continue;
      }

      throw new Error(
        `Failed to select parser for file "${trafficFile}" using format "${options.format}": ${(error as Error).message}`
      );
    }

    supportedTrafficFileCount += 1;

    for await (const exchange of parser.parse(trafficFile)) {
      await session.process({ ...exchange, index: exchangeIndex });
      exchangeIndex += 1;
    }
  }

  if (supportedTrafficFileCount === 0) {
    throw new Error(
      'No supported traffic files found. In auto mode, files must match built-in or plugin traffic parser signatures.'
    );
  }

  if (exchangeIndex === 0) {
    throw new Error('No HTTP exchanges were parsed from the provided traffic files.');
  }

  return session.finalize();
}
