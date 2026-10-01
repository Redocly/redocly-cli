import { logger, HandledError, AbortFlowError } from '@redocly/openapi-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { CommandArgs } from '../../wrapper.js';
import { renderCoverageJson, renderCoverageOverview } from './engine/coverage-reporter.js';
import { renderReport, type ReportFormat } from './engine/reporter.js';
import { runTrafficValidation } from './engine/runner.js';
import { loadOpenApiIndex } from './openapi/loader.js';
import type {
  FindingSeverity,
  MatchMode,
  OpenApiIndex,
  RunSummary,
  TrafficFormat,
} from './types/index.js';
import { parseCsv } from './utils/args.js';
import { normalizeFsPath } from './utils/files.js';

export type DriftArgv = {
  traffic: string;
  api: string;
  'traffic-format': TrafficFormat;
  'report-format': ReportFormat;
  'match-mode'?: MatchMode;
  'ignore-cookies'?: boolean;
  'ignore-headers'?: string;
  'max-findings': number;
  rules?: string;
  output?: string;
  server?: string;
  'min-severity': FindingSeverity;
  coverage?: boolean;
  'coverage-output'?: string;
};

const USE_COLOR = Boolean(process.stdout.isTTY) && process.env.NO_COLOR === undefined;

function collectSpecServerUrls(openApiIndex: OpenApiIndex): string[] {
  const urls = new Set<string>();
  for (const operations of openApiIndex.operationsByMethod.values()) {
    for (const operation of operations) {
      for (const server of operation.servers) {
        urls.add(server.rawUrl);
      }
    }
  }
  return Array.from(urls).sort();
}

function warnWhenNothingMatched(
  summary: RunSummary,
  openApiIndex: OpenApiIndex,
  server: string | undefined
): void {
  const validatedExchanges = summary.totalExchanges - summary.skippedExchanges;
  if (validatedExchanges === 0 && summary.skippedExchanges > 0) {
    logger.warn(
      `All ${summary.skippedExchanges} exchange(s) were outside the --server "${server}" and were skipped. Check that the server matches the traffic URLs.\n`
    );
    return;
  }

  if (summary.documentedExchanges > 0 || validatedExchanges === 0) {
    return;
  }

  const serverUrls = collectSpecServerUrls(openApiIndex);
  const hint = server
    ? `Check that the --server "${server}" matches the traffic URLs and that the description paths align with the remainder.`
    : summary.hostCompatibleExchanges === validatedExchanges
      ? `The traffic hosts are compatible with the description servers (${serverUrls.join(
          ', '
        )}), so the endpoints are likely undocumented; if they should be documented, check that the description base paths and paths align with the traffic URLs, or use --server to declare the server the traffic was captured against.`
      : `Check that the traffic host and base path match the description servers (${serverUrls.join(
          ', '
        )}), or use --server to declare the server the traffic was captured against.`;
  logger.warn(
    `None of the ${validatedExchanges} validated exchange(s) matched a documented operation. ${hint}\n`
  );
}

async function writeOutput(outputPath: string, content: string): Promise<void> {
  const resolved = normalizeFsPath(outputPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
}

export async function handleDrift({ argv, config }: CommandArgs<DriftArgv>) {
  const trafficPath = normalizeFsPath(argv.traffic);
  const trafficFormat = argv['traffic-format'];
  const activeRules = argv.rules ? parseCsv(argv.rules) : undefined;
  const ignoreHeaders = argv['ignore-headers'] ? parseCsv(argv['ignore-headers']) : undefined;

  const server = argv.server;
  if (server && argv['match-mode']) {
    throw new HandledError(
      'The --server and --match-mode options are mutually exclusive: --match-mode controls how requests are located via the description servers, while --server replaces the description servers with the one the traffic was captured against.'
    );
  }
  const matchMode = argv['match-mode'] ?? 'strict-host';

  const specPath = normalizeFsPath(argv.api);
  const openApiIndex = await loadOpenApiIndex(specPath, config);
  if (openApiIndex.loadedOperations === 0) {
    throw new HandledError(`No OpenAPI operations were loaded from: ${specPath}`);
  }

  const coverageOutput = argv['coverage-output'];
  const { runId, summary, findings, coverage } = await runTrafficValidation({
    trafficPath,
    format: trafficFormat,
    matchMode,
    ignoreCookies: argv['ignore-cookies'],
    ignoreHeaders,
    previewFindingsLimit: argv['max-findings'],
    activeRules,
    openApiIndex,
    server,
    minSeverity: argv['min-severity'],
    coverage: argv.coverage || coverageOutput !== undefined,
  });

  warnWhenNothingMatched(summary, openApiIndex, server);

  const report = renderReport(
    {
      runId,
      summary,
      findings,
      meta: {
        specSource: specPath,
        trafficPath,
        format: trafficFormat,
        matchMode,
        server,
      },
    },
    {
      format: argv['report-format'],
      color: USE_COLOR && argv['report-format'] === 'pretty' && !argv.output,
      maxFindings: argv['max-findings'],
    }
  );

  if (argv.output) {
    await writeOutput(argv.output, report);
    logger.info(`Drift report written to: ${normalizeFsPath(argv.output)}\n`);
  } else {
    logger.output(report);
  }

  // The overview is meant for people, so it stays off stdout when stdout carries
  // a machine-readable report.
  const stdoutIsMachineReadable = argv['report-format'] !== 'pretty' && !argv.output;
  if (argv.coverage && coverage) {
    const overview = renderCoverageOverview(coverage, USE_COLOR && !stdoutIsMachineReadable);
    if (stdoutIsMachineReadable) {
      logger.info(`\n${overview}`);
    } else {
      logger.output(`\n${overview}`);
    }
  }

  if (coverageOutput && coverage) {
    await writeOutput(
      coverageOutput,
      renderCoverageJson(coverage, { spec: specPath, traffic: trafficPath, matchMode, server })
    );
    logger.info(`Coverage report written to: ${normalizeFsPath(coverageOutput)}\n`);
  }

  // Signal a non-zero exit when error-level drift is found, without printing an
  // extra error line (AbortFlowError is swallowed by the command wrapper).
  if (summary.findingsBySeverity.error > 0) {
    throw new AbortFlowError('Drift detected.');
  }
}
