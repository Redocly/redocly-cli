import { isPlainObject, logger } from '@redocly/openapi-core';
import { randomUUID } from 'node:crypto';

import { matchOperation } from '../openapi/matcher.js';
import { loadRulePlugins } from '../rules/registry.js';
import type {
  Finding,
  FindingPreview,
  FindingRecord,
  FindingSeverity,
  MatchMode,
  NormalizedExchange,
  OpenApiIndex,
  RuleContext,
  RulePlugin,
  RunSummary,
} from '../types/index.js';
import { createProblemKey } from '../utils/finding-groups.js';
import { normalizeServerPrefix, resolvePathForServer } from '../utils/server.js';
import { SchemaValidator } from './schema-validator.js';

const DEFAULT_FINDINGS_PREVIEW_LIMIT = 10;

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

interface CounterState {
  totalExchanges: number;
  documentedExchanges: number;
  undocumentedExchanges: number;
  skippedExchanges: number;
  findingsBySeverity: RunSummary['findingsBySeverity'];
  findingsByRule: Record<string, number>;
}

function createInitialCounters(): CounterState {
  return {
    totalExchanges: 0,
    documentedExchanges: 0,
    undocumentedExchanges: 0,
    skippedExchanges: 0,
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
      logger.warn(`Rule "${rule.id}" failed to execute: ${(error as Error).message}\n`);
    }
  }

  return findings;
}

export interface RunnerResult {
  runId: string;
  summary: RunSummary;
  findings: FindingRecord[];
}

export interface ValidationSessionOptions {
  openApiIndex: OpenApiIndex;
  matchMode: MatchMode;
  ignoreCookies?: boolean;
  previewFindingsLimit?: number;
  activeRules?: string[];
  pluginModules: string[];
  /**
   * Server the traffic was captured against. When set, only requests under it
   * are validated (others are skipped) and paths are matched relative to it
   * instead of the spec servers.
   */
  server?: string;
  /** Findings below this severity are discarded. */
  minSeverity?: FindingSeverity;
}

/**
 * Stateful validation engine shared by the batch `drift` runner and the live
 * `proxy` server: each exchange is matched to a documented operation, run
 * through the configured rules, and accumulated entirely in memory so a report
 * can be rendered without a database.
 */
export class ValidationSession {
  private readonly startedAt = Date.now();
  private readonly runId = randomUUID();
  private readonly previewLimit: number;
  private readonly rules: RulePlugin[];
  private readonly schemaValidator = new SchemaValidator();
  private readonly coercingSchemaValidator = new SchemaValidator({ coerceTypes: true });
  private readonly options: ValidationSessionOptions;

  private readonly counters = createInitialCounters();
  private readonly findings: FindingRecord[] = [];
  private readonly previewFindings: FindingPreview[] = [];
  private readonly problemGroupsByRule: Record<string, number> = {};
  private readonly problemKeyStats = new Map<
    string,
    { occurrences: number; previewIndex: number | null }
  >();
  private totalProblemGroups = 0;

  private readonly server: string | undefined;
  private readonly minSeverityRank: number;

  private constructor(options: ValidationSessionOptions, rules: RulePlugin[]) {
    this.options = options;
    this.rules = rules;
    this.server = normalizeServerPrefix(options.server);
    this.minSeverityRank = SEVERITY_RANK[options.minSeverity ?? 'info'];
    this.previewLimit =
      options.previewFindingsLimit && options.previewFindingsLimit > 0
        ? options.previewFindingsLimit
        : DEFAULT_FINDINGS_PREVIEW_LIMIT;
  }

  static async create(options: ValidationSessionOptions): Promise<ValidationSession> {
    if (options.openApiIndex.loadedOperations === 0) {
      throw new Error('No OpenAPI operations available to validate traffic against.');
    }

    const rules = await loadRulePlugins(options.activeRules, options.pluginModules);
    for (const plugin of rules) {
      if (typeof plugin.setup === 'function') {
        await plugin.setup();
      }
    }

    return new ValidationSession(options, rules);
  }

  /**
   * Validate a single exchange and return the finding records produced for it,
   * so callers (e.g. the proxy) can surface findings live as they arrive.
   */
  async process(exchange: NormalizedExchange): Promise<FindingRecord[]> {
    this.counters.totalExchanges += 1;

    let relativePathOverride: string | undefined;
    if (this.server !== undefined) {
      relativePathOverride = resolvePathForServer(exchange.request, this.server);
      if (relativePathOverride === undefined) {
        this.counters.skippedExchanges += 1;
        return [];
      }
    }

    const matchedOperation = matchOperation(
      this.options.openApiIndex,
      exchange,
      this.options.matchMode,
      relativePathOverride
    );
    if (matchedOperation) {
      this.counters.documentedExchanges += 1;
    } else {
      this.counters.undocumentedExchanges += 1;
    }

    const exchangeFindings = await executeRules(this.rules, {
      exchange,
      matchedOperation,
      matchMode: this.options.matchMode,
      ignoreCookies: this.options.ignoreCookies ?? false,
      validateSchema: (schema, value, options) =>
        options?.coerce
          ? this.coercingSchemaValidator.validate(schema, value, options?.target)
          : this.schemaValidator.validate(schema, value, options?.target),
    });

    const records: FindingRecord[] = [];
    for (const finding of exchangeFindings) {
      if (SEVERITY_RANK[finding.severity] < this.minSeverityRank) {
        continue;
      }

      ensureOperationContextInFinding(finding, matchedOperation);
      const record = toFindingRecord(finding, exchange);
      this.findings.push(record);
      records.push(record);
      accumulateFinding(this.counters, finding);

      const problemKey = createProblemKey({
        ruleId: finding.ruleId,
        severity: finding.severity,
        message: finding.message,
        operationId: finding.operationId,
        path: exchange.request.path,
        target: finding.target,
        schemaPath: finding.schemaPath,
      });

      const existingProblem = this.problemKeyStats.get(problemKey);
      if (existingProblem) {
        existingProblem.occurrences += 1;
        if (existingProblem.previewIndex !== null) {
          this.previewFindings[existingProblem.previewIndex].occurrences =
            existingProblem.occurrences;
        }
        continue;
      }

      this.totalProblemGroups += 1;
      this.problemGroupsByRule[finding.ruleId] =
        (this.problemGroupsByRule[finding.ruleId] ?? 0) + 1;

      if (this.previewFindings.length < this.previewLimit) {
        const previewIndex = this.previewFindings.length;
        this.previewFindings.push(mapFindingToPreview(finding, exchange));
        this.problemKeyStats.set(problemKey, { occurrences: 1, previewIndex });
        continue;
      }

      this.problemKeyStats.set(problemKey, { occurrences: 1, previewIndex: null });
    }

    return records;
  }

  finalize(): RunnerResult {
    const summary: RunSummary = {
      runId: this.runId,
      totalExchanges: this.counters.totalExchanges,
      documentedExchanges: this.counters.documentedExchanges,
      undocumentedExchanges: this.counters.undocumentedExchanges,
      skippedExchanges: this.counters.skippedExchanges,
      findingsBySeverity: this.counters.findingsBySeverity,
      findingsByRule: this.counters.findingsByRule,
      problemGroupsByRule: this.problemGroupsByRule,
      totalProblemGroups: this.totalProblemGroups,
      durationMs: Date.now() - this.startedAt,
      previewFindings: this.previewFindings,
      previewLimit: this.previewLimit,
      previewTruncated: this.totalProblemGroups > this.previewFindings.length,
    };

    return { runId: this.runId, summary, findings: this.findings };
  }
}
