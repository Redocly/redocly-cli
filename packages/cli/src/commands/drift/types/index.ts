export type MatchMode = 'strict-host' | 'basepath';

export type TrafficFormat = 'auto' | 'har' | 'kong' | 'ndjson' | 'nginx-json' | 'apache-json';

export type FindingSeverity = 'info' | 'warning' | 'error';

export type FindingCategory = 'documentation' | 'schema' | 'security';

export interface SchemaValidationError {
  keyword?: string;
  message?: string;
  params?: Record<string, unknown>;
  schemaPath?: string;
  instancePath?: string;
}

export interface NormalizedHttpMessage {
  headers: Record<string, string>;
  /** Content type resolved from the capture-specific field or the headers. */
  contentType?: string;
  bodyText?: string;
  bodyJson?: unknown;
}

export interface NormalizedRequest extends NormalizedHttpMessage {
  method: string;
  url: string;
  path: string;
  query: URLSearchParams;
  protocol: string;
  /** False when the capture did not record the scheme and a default was assumed. */
  protocolKnown: boolean;
  host?: string;
}

export interface NormalizedResponse extends NormalizedHttpMessage {
  status: number;
  statusText?: string;
}

export interface NormalizedExchange {
  index: number;
  source: string;
  startedAt?: string;
  request: NormalizedRequest;
  response?: NormalizedResponse;
  raw?: unknown;
}

export interface Finding {
  ruleId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  message: string;
  exchangeIndex: number;
  operationId?: string;
  specSource?: string;
  target?: 'request' | 'response';
  schemaPath?: string;
  dataPath?: string;
  details?: Record<string, unknown>;
}

export interface FindingPreview {
  exchangeIndex: number;
  ruleId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  message: string;
  occurrences: number;
  operationId?: string;
  specSource?: string;
  target?: 'request' | 'response';
  schemaPath?: string;
  dataPath?: string;
  details?: Record<string, unknown>;
  method: string;
  url: string;
  path: string;
  status?: number;
}

export interface OpenApiServer {
  rawUrl: string;
  protocol?: string;
  host?: string;
  basePath: string;
}

export interface OpenApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required: boolean;
  schema?: unknown;
}

export interface OpenApiOperation {
  operationId: string;
  method: string;
  pathTemplate: string;
  pathRegex: RegExp;
  pathParams: string[];
  pathScore: number;
  servers: OpenApiServer[];
  requestParameters: OpenApiParameter[];
  requestBodyContent: Record<string, unknown>;
  requestBodyRequired: boolean;
  responseBodyContent: Record<string, Record<string, unknown>>;
  security: Record<string, string[]>[] | undefined;
  securitySchemes: Record<string, unknown>;
  specSource: string;
}

export interface OpenApiIndex {
  operationsByMethod: Map<string, OpenApiOperation[]>;
  loadedSpecs: number;
  loadedOperations: number;
}

export interface MatchedOperation {
  operation: OpenApiOperation;
  pathParams: Record<string, string>;
}

export interface RuleContext {
  exchange: NormalizedExchange;
  matchedOperation: MatchedOperation | null;
  matchMode: MatchMode;
  /** Whether the request host is compatible with at least one description server. */
  hostCompatibleWithSpecServers: boolean;
  ignoreCookies?: boolean;
  validateSchema: (
    schema: unknown,
    value: unknown,
    options?: { coerce?: boolean; target?: 'request' | 'response' }
  ) => { valid: boolean; errors: SchemaValidationError[] };
}

export interface RulePlugin {
  id: string;
  setup?(): Promise<void> | void;
  analyze(context: RuleContext): Promise<Finding[]> | Finding[];
}

export interface TrafficParser {
  id: Exclude<TrafficFormat, 'auto'>;
  canParse(filePath: string, probe: string): boolean;
  parse(filePath: string): AsyncIterable<NormalizedExchange>;
}

export interface RunSummary {
  runId: string;
  totalExchanges: number;
  documentedExchanges: number;
  undocumentedExchanges: number;
  /** Exchanges outside the configured server, excluded from validation. */
  skippedExchanges: number;
  /** Validated exchanges whose host is compatible with a description server. */
  hostCompatibleExchanges: number;
  findingsBySeverity: Record<FindingSeverity, number>;
  findingsByRule: Record<string, number>;
  problemGroupsByRule: Record<string, number>;
  totalProblemGroups: number;
  durationMs: number;
  previewFindings: FindingPreview[];
  previewLimit: number;
  previewTruncated: boolean;
}

export interface RunnerOptions {
  trafficPath: string;
  format: TrafficFormat;
  matchMode: MatchMode;
  ignoreCookies?: boolean;
  previewFindingsLimit?: number;
  trafficParserModules: string[];
  pluginModules: string[];
  activeRules?: string[];
  /** Pre-loaded OpenAPI index. */
  openApiIndex: OpenApiIndex;
  server?: string;
  minSeverity?: FindingSeverity;
}

/**
 * A single finding flattened with its originating exchange context, retained in
 * memory so reports can be rendered without a database.
 */
export interface FindingRecord extends Finding {
  id: string;
  method: string;
  url: string;
  path: string;
  status?: number;
}

/** Full in-memory result of a drift run, consumed directly by the reporter. */
export interface DriftRunResult {
  runId: string;
  meta: {
    specSource: string;
    trafficPath: string;
    format: TrafficFormat;
    matchMode: MatchMode;
    server?: string;
  };
  summary: RunSummary;
  findings: FindingRecord[];
}
