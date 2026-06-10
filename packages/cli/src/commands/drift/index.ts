import { logger, stringifyYaml } from '@redocly/openapi-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { AbortFlowError, exitWithError } from '../../utils/error.js';
import type { CommandArgs } from '../../wrapper.js';
import { renderReport, type ReportFormat } from './engine/reporter.js';
import { runTrafficValidation } from './engine/runner.js';
import { generateSpecFromTraffic } from './openapi/generator.js';
import { buildOpenApiIndex, loadOpenApiIndex } from './openapi/loader.js';
import type { MatchMode, TrafficFormat } from './types/index.js';
import { normalizeFsPath } from './utils/files.js';

export type DriftArgv = {
  traffic: string;
  api?: string;
  'traffic-format': TrafficFormat;
  format: ReportFormat;
  'match-mode': MatchMode;
  'ignore-cookies'?: boolean;
  'max-findings': number;
  rules?: string;
  plugin?: string[];
  'traffic-plugin'?: string[];
  'generate-output'?: string;
  'api-prefix'?: string;
  config?: string;
};

const USE_COLOR = Boolean(process.stdout.isTTY) && process.env.NO_COLOR === undefined;

function parseCsv(input: string): string[] {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
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
  const trafficParserModules = (argv['traffic-plugin'] ?? []).map(normalizeFsPath);
  const pluginModules = (argv.plugin ?? []).map(normalizeFsPath);

  // No spec provided → generate an OpenAPI description from the traffic itself.
  if (!argv.api) {
    await handleGenerate({
      trafficPath,
      trafficFormat,
      trafficParserModules,
      output: argv['generate-output'],
      apiPrefix: argv['api-prefix'],
    });
    return;
  }

  const specPath = normalizeFsPath(argv.api);
  const openApiIndex = await loadOpenApiIndex(specPath, config);
  if (openApiIndex.loadedOperations === 0) {
    return exitWithError(`No OpenAPI operations were loaded from: ${specPath}`);
  }

  const { runId, summary, findings } = await runTrafficValidation({
    trafficPath,
    format: trafficFormat,
    matchMode: argv['match-mode'],
    ignoreCookies: argv['ignore-cookies'],
    previewFindingsLimit: argv['max-findings'],
    trafficParserModules,
    pluginModules,
    activeRules,
    openApiIndex,
  });

  const report = renderReport(
    {
      runId,
      summary,
      findings,
      meta: {
        specSource: specPath,
        trafficPath,
        format: trafficFormat,
        matchMode: argv['match-mode'],
        generatedSpec: false,
      },
    },
    {
      format: argv.format,
      color: USE_COLOR && argv.format === 'pretty',
      maxFindings: argv['max-findings'],
    }
  );

  logger.output(report);

  // Signal a non-zero exit when error-level drift is found, without printing an
  // extra error line (AbortFlowError is swallowed by the command wrapper).
  if (summary.findingsBySeverity.error > 0) {
    throw new AbortFlowError('Drift detected.');
  }
}

async function handleGenerate(params: {
  trafficPath: string;
  trafficFormat: TrafficFormat;
  trafficParserModules: string[];
  output?: string;
  apiPrefix?: string;
}): Promise<void> {
  const document = await generateSpecFromTraffic({
    trafficPath: params.trafficPath,
    format: params.trafficFormat,
    trafficParserModules: params.trafficParserModules,
    apiPrefix: params.apiPrefix,
  });

  // Sanity-check that the generated document yields a usable index.
  const index = buildOpenApiIndex([{ document, source: '(generated)' }]);
  const yaml = stringifyYaml(document);

  if (params.output) {
    await writeOutput(params.output, yaml);
    logger.info(
      `Generated OpenAPI description from traffic: ${index.loadedOperations} operation(s).\nWritten to: ${normalizeFsPath(
        params.output
      )}\n`
    );
    return;
  }

  logger.output(yaml);
}
