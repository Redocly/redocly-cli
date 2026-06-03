export type MatchMode = 'strict-host' | 'basepath';

export type TrafficFormat = 'auto' | 'har' | 'kong' | 'ndjson' | 'nginx-json' | 'apache-json';

export type FindingSeverity = 'info' | 'warning' | 'error';

export type FindingCategory = 'documentation' | 'schema' | 'security';

export interface NormalizedHttpMessage {
  headers: Record<string, string>;
  bodyText?: string;
  bodyJson?: unknown;
}

export interface NormalizedRequest extends NormalizedHttpMessage {
  method: string;
  url: string;
  path: string;
  query: URLSearchParams;
  protocol: string;
  host?: string;
}

export interface NormalizedResponse extends NormalizedHttpMessage {
  status: number;
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
  securitySchemes: Record<string, any>;
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
  ignoreCookies?: boolean;
  validateSchema: (schema: unknown, value: unknown) => { valid: boolean; errors: any[] };
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
  /** Pre-loaded OpenAPI index (provided or generated from traffic). */
  openApiIndex: OpenApiIndex;
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
    /** True when the spec was generated from traffic rather than provided. */
    generatedSpec: boolean;
  };
  summary: RunSummary;
  findings: FindingRecord[];
}
