import { logger } from '@redocly/openapi-core';

import type { VerifyConfigOptions } from '../../types.js';
import { AbortFlowError, exitWithError } from '../../utils/error.js';
import type { CommandArgs } from '../../wrapper.js';
import { renderReport, type ReportFormat } from '../drift/engine/reporter.js';
import { ValidationSession } from '../drift/engine/validation-session.js';
import { loadOpenApiIndex } from '../drift/openapi/loader.js';
import type { DriftRunResult, FindingRecord, MatchMode } from '../drift/types/index.js';
import { normalizeFsPath } from '../drift/utils/files.js';
import { HarWriter } from './har-writer.js';
import { startProxyServer, type RunningProxyServer } from './server.js';

export type ProxyArgv = {
  target: string;
  port: number;
  host: string;
  har: string;
  api?: string;
  format: ReportFormat;
  'match-mode': MatchMode;
  'ignore-cookies'?: boolean;
  'max-findings': number;
  rules?: string;
  plugin?: string[];
} & VerifyConfigOptions;

const USE_COLOR = Boolean(process.stdout.isTTY) && process.env.NO_COLOR === undefined;

function parseCsv(input: string): string[] {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function severityIcon(severity: FindingRecord['severity']): string {
  if (severity === 'error') return '✖';
  if (severity === 'warning') return '▲';
  return '●';
}

function formatLiveFinding(finding: FindingRecord): string {
  const status = finding.status !== undefined ? ` (${finding.status})` : '';
  const operation = finding.operationId ? ` ${finding.operationId}` : '';
  return `${severityIcon(finding.severity)} ${finding.severity.toUpperCase()} ${finding.method} ${
    finding.path
  }${status}${operation} → [${finding.ruleId}] ${finding.message}`;
}

function waitForShutdownSignal(): Promise<void> {
  return new Promise((resolve) => {
    process.once('SIGINT', () => resolve());
    process.once('SIGTERM', () => resolve());
  });
}

export async function handleProxy({ argv, config, version }: CommandArgs<ProxyArgv>) {
  const targetInput = /^[a-z][a-z0-9+.-]*:\/\//i.test(argv.target)
    ? argv.target
    : `http://${argv.target}`;

  let target: URL;
  try {
    target = new URL(targetInput);
  } catch {
    return exitWithError(`Invalid --target URL: ${argv.target}`);
  }

  const harPath = normalizeFsPath(argv.har);
  const harWriter = new HarWriter(harPath, version);

  let session: ValidationSession | null = null;
  if (argv.api) {
    const specPath = normalizeFsPath(argv.api);
    const openApiIndex = await loadOpenApiIndex(specPath, config);
    if (openApiIndex.loadedOperations === 0) {
      return exitWithError(`No OpenAPI operations were loaded from: ${specPath}`);
    }

    session = await ValidationSession.create({
      openApiIndex,
      matchMode: argv['match-mode'],
      ignoreCookies: argv['ignore-cookies'],
      previewFindingsLimit: argv['max-findings'],
      activeRules: argv.rules ? parseCsv(argv.rules) : undefined,
      pluginModules: (argv.plugin ?? []).map(normalizeFsPath),
    });
  }

  let exchangeQueue: Promise<void> = Promise.resolve();

  let server: RunningProxyServer;
  try {
    server = await startProxyServer({
      target: target.toString(),
      port: argv.port,
      host: argv.host,
      onExchange: ({ exchange, harEntry }) => {
        const task = exchangeQueue.then(async () => {
          try {
            await harWriter.add(harEntry);
          } catch (error) {
            logger.error(`Failed to write HAR entry: ${(error as Error).message}\n`);
          }

          if (!session) {
            return;
          }

          const findings = await session.process(exchange);
          for (const finding of findings) {
            logger.info(`${formatLiveFinding(finding)}\n`);
          }
        });
        exchangeQueue = task.catch(() => undefined);
        return task;
      },
      onError: (error) => {
        logger.error(`Proxy request failed: ${error.message}\n`);
      },
    });
  } catch (error) {
    return exitWithError(`Failed to start proxy server: ${(error as Error).message}`);
  }

  logger.info(`Proxy listening on ${server.url} → forwarding to ${target.toString()}\n`);
  logger.info(`Recording traffic to ${harPath}\n`);
  if (session) {
    logger.info(`Validating live traffic against ${normalizeFsPath(argv.api!)}\n`);
  }
  logger.info('Press Ctrl+C to stop.\n');

  await waitForShutdownSignal();

  logger.info('\nShutting down proxy…\n');
  await server.close();
  await exchangeQueue;
  await harWriter.finalize();
  logger.info(`Captured ${harWriter.entryCount} exchange(s) to ${harPath}\n`);

  if (!session) {
    return;
  }

  const { runId, summary, findings } = session.finalize();
  const result: DriftRunResult = {
    runId,
    summary,
    findings,
    meta: {
      specSource: normalizeFsPath(argv.api!),
      trafficPath: harPath,
      format: 'har',
      matchMode: argv['match-mode'],
    },
  };

  const report = renderReport(result, {
    format: argv.format,
    color: USE_COLOR && argv.format === 'pretty',
    maxFindings: argv['max-findings'],
  });

  logger.output(report);

  if (summary.findingsBySeverity.error > 0) {
    throw new AbortFlowError('Drift detected.');
  }
}
