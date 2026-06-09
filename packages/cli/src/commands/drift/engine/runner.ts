import { isPlainObject } from '@redocly/openapi-core';
import { randomUUID } from 'node:crypto';

import { loadTrafficParsers, selectTrafficParser } from '../log-formats/registry.js';
import { matchOperation } from '../openapi/matcher.js';
import { loadRulePlugins } from '../rules/registry.js';
import type {
  Finding,
  FindingPreview,
  FindingRecord,
  NormalizedExchange,
  RuleContext,
  RulePlugin,
  RunnerOptions,
  RunSummary,
} from '../types/index.js';
import { listFilesRecursively } from '../utils/files.js';
import { createProblemKey } from '../utils/finding-groups.js';
import { SchemaValidator } from './schema-validator.js';

const DEFAULT_FINDINGS_PREVIEW_LIMIT = 10;

interface CounterState {
  totalExchanges: number;
  documentedExchanges: number;
  undocumentedExchanges: number;
  findingsBySeverity: RunSummary['findingsBySeverity'];
  findingsByRule: Record<string, number>;
}

function createInitialCounters(): CounterState {
  return {
    totalExchanges: 0,
    documentedExchanges: 0,
    undocumentedExchanges: 0,
    findingsBySeverity: {
      info: 0,
      warning: 0,
      error: 0,
    },
    findingsByRule: {},
  };
}

function accumulateFinding(counters: CounterState, finding: Finding): void {
  counters.findingsBySeverity[finding.severity] += 1;
  counters.findingsByRule[finding.ruleId] = (counters.findingsByRule[finding.ruleId] ?? 0) + 1;
}

function toFindingRecord(finding: Finding, exchange: NormalizedExchange): FindingRecord {
  return {
    ...finding,
    id: randomUUID(),
    method: exchange.request.method,
    url: exchange.request.url,
    path: exchange.request.path,
    status: exchange.response?.status,
  };
}

function mapFindingToPreview(finding: Finding, exchange: NormalizedExchange): FindingPreview {
  return {
    exchangeIndex: finding.exchangeIndex,
    ruleId: finding.ruleId,
    severity: finding.severity,
    category: finding.category,
    message: finding.message,
    occurrences: 1,
    operationId: finding.operationId,
    specSource: finding.specSource,
    target: finding.target,
    schemaPath: finding.schemaPath,
    dataPath: finding.dataPath,
    details: finding.details,
    method: exchange.request.method,
    url: exchange.request.url,
    path: exchange.request.path,
    status: exchange.response?.status,
  };
}

function ensureOperationContextInFinding(
  finding: Finding,
  matchedOperation: RuleContext['matchedOperation']
): void {
  if (!matchedOperation) {
    return;
  }

  if (!finding.operationId) {
    finding.operationId = matchedOperation.operation.operationId;
  }

  if (!finding.specSource) {
    finding.specSource = matchedOperation.operation.specSource;
  }

  const existingDetails = finding.details ?? {};
  if (!isPlainObject(existingDetails)) {
    finding.details = {
      operationPathTemplate: matchedOperation.operation.pathTemplate,
    };
    return;
  }

  if (typeof existingDetails.operationPathTemplate !== 'string') {
    existingDetails.operationPathTemplate = matchedOperation.operation.pathTemplate;
  }

  finding.details = existingDetails;
}

async function executeRules(rules: RulePlugin[], context: RuleContext): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const rule of rules) {
    try {
      const ruleFindings = await rule.analyze(context);
      if (ruleFindings.length > 0) {
        findings.push(...ruleFindings);
      }
    } catch (error) {
      findings.push({
        ruleId: rule.id,
        severity: 'error',
        category: 'schema',
        message: `Rule execution failed: ${(error as Error).message}`,
        exchangeIndex: context.exchange.index,
        operationId: context.matchedOperation?.operation.operationId,
        specSource: context.matchedOperation?.operation.specSource,
      });
    }
  }

  return findings;
}

export interface RunnerResult {
  runId: string;
  summary: RunSummary;
  findings: FindingRecord[];
}

/**
 * Stream the traffic logs, match each exchange to a documented operation, run
 * the configured rules, and accumulate findings entirely in memory.
 */
export async function runTrafficValidation(options: RunnerOptions): Promise<RunnerResult> {
  const startedAt = Date.now();
  const runId = randomUUID();
  const previewLimit =
    options.previewFindingsLimit && options.previewFindingsLimit > 0
      ? options.previewFindingsLimit
      : DEFAULT_FINDINGS_PREVIEW_LIMIT;

  const openApiIndex = options.openApiIndex;
  if (openApiIndex.loadedOperations === 0) {
    throw new Error('No OpenAPI operations available to validate traffic against.');
  }

  const trafficFiles = await listFilesRecursively(options.trafficPath);
  if (trafficFiles.length === 0) {
    throw new Error('No traffic files found in the provided traffic path.');
  }

  const externalParsers = await loadTrafficParsers(options.trafficParserModules);
  const rulePlugins = await loadRulePlugins(options.activeRules, options.pluginModules);

  for (const plugin of rulePlugins) {
    if (typeof plugin.setup === 'function') {
      await plugin.setup();
    }
  }

  const schemaValidator = new SchemaValidator();

  const counters = createInitialCounters();
  const findings: FindingRecord[] = [];
  const previewFindings: FindingPreview[] = [];
  const problemGroupsByRule: Record<string, number> = {};
  const problemKeyStats = new Map<string, { occurrences: number; previewIndex: number | null }>();
  let totalProblemGroups = 0;
  let supportedTrafficFileCount = 0;

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
      counters.totalExchanges += 1;

      const matchedOperation = matchOperation(openApiIndex, exchange, options.matchMode);
      const documented = Boolean(matchedOperation);

      if (documented) {
        counters.documentedExchanges += 1;
      } else {
        counters.undocumentedExchanges += 1;
      }

      const exchangeFindings = await executeRules(rulePlugins, {
        exchange,
        matchedOperation,
        matchMode: options.matchMode,
        ignoreCookies: options.ignoreCookies ?? false,
        validateSchema: schemaValidator.validate.bind(schemaValidator),
      });

      for (const finding of exchangeFindings) {
        ensureOperationContextInFinding(finding, matchedOperation);
        findings.push(toFindingRecord(finding, exchange));
        accumulateFinding(counters, finding);

        const problemKey = createProblemKey({
          ruleId: finding.ruleId,
          severity: finding.severity,
          message: finding.message,
          operationId: finding.operationId,
          path: exchange.request.path,
          target: finding.target,
          schemaPath: finding.schemaPath,
        });

        const existingProblem = problemKeyStats.get(problemKey);
        if (existingProblem) {
          existingProblem.occurrences += 1;
          if (existingProblem.previewIndex !== null) {
            previewFindings[existingProblem.previewIndex].occurrences = existingProblem.occurrences;
          }
          continue;
        }

        totalProblemGroups += 1;
        problemGroupsByRule[finding.ruleId] = (problemGroupsByRule[finding.ruleId] ?? 0) + 1;

        if (previewFindings.length < previewLimit) {
          const previewIndex = previewFindings.length;
          previewFindings.push(mapFindingToPreview(finding, exchange));
          problemKeyStats.set(problemKey, { occurrences: 1, previewIndex });
          continue;
        }

        problemKeyStats.set(problemKey, { occurrences: 1, previewIndex: null });
      }
    }
  }

  if (supportedTrafficFileCount === 0) {
    throw new Error(
      'No supported traffic files found. In auto mode, files must match built-in or plugin traffic parser signatures.'
    );
  }

  const summary: RunSummary = {
    runId,
    totalExchanges: counters.totalExchanges,
    documentedExchanges: counters.documentedExchanges,
    undocumentedExchanges: counters.undocumentedExchanges,
    findingsBySeverity: counters.findingsBySeverity,
    findingsByRule: counters.findingsByRule,
    problemGroupsByRule,
    totalProblemGroups,
    durationMs: Date.now() - startedAt,
    previewFindings,
    previewLimit,
    previewTruncated: totalProblemGroups > previewFindings.length,
  };

  return { runId, summary, findings };
}
