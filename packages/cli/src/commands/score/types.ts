export interface OperationMetrics {
  path: string;
  method: string;
  operationId?: string;

  parameterCount: number;
  requiredParameterCount: number;
  paramsWithDescription: number;
  requestBodyPresent: boolean;

  topLevelWritableFieldCount: number;
  maxRequestSchemaDepth: number;
  maxResponseSchemaDepth: number;

  polymorphismCount: number;
  anyOfCount: number;
  hasDiscriminator: boolean;

  operationDescriptionPresent: boolean;
  schemaPropertiesWithDescription: number;
  totalSchemaProperties: number;

  constraintCount: number;

  requestExamplePresent: boolean;
  responseExamplePresent: boolean;

  structuredErrorResponseCount: number;
  totalErrorResponses: number;

  ambiguousIdentifierCount: number;

  refsUsed: Set<string>;
}

export interface DocumentMetrics {
  operationCount: number;
  operations: Map<string, OperationMetrics>;
}

export interface Subscores {
  parameterSimplicity: number;
  schemaSimplicity: number;
  documentationQuality: number;
  constraintClarity: number;
  exampleCoverage: number;
  errorClarity: number;
  dependencyClarity: number;
  identifierClarity: number;
  polymorphismClarity: number;
}

export interface OperationScores {
  agentReadiness: number;
  subscores: Subscores;
}

export type HotspotIssueCode =
  | 'high_parameter_count'
  | 'deep_schema_nesting'
  | 'any_of_without_discriminator'
  | 'high_polymorphism_count'
  | 'missing_request_and_response_examples'
  | 'missing_request_body_examples'
  | 'missing_response_examples'
  | 'no_structured_error_responses'
  | 'missing_operation_description'
  | 'no_parameter_descriptions'
  | 'high_dependency_depth'
  | 'ambiguous_identifiers';

export interface HotspotIssue {
  code: HotspotIssueCode;
  message: string;
}

export interface HotspotOperation {
  path: string;
  method: string;
  operationId?: string;
  agentReadinessScore: number;
  reasons: string[];
  issues: HotspotIssue[];
}

export interface ScoreResult {
  agentReadiness: number;
  discoverability: number;
  subscores: Subscores;
  rawMetrics: DocumentMetrics;
  hotspots: HotspotOperation[];
  operationScores: Map<string, OperationScores>;
  dependencyDepths: Map<string, number>;
}

export interface ScoringThresholds {
  maxParamsGood: number;
  maxDepthGood: number;
  maxPolymorphismGood: number;
  maxDependencyDepthGood: number;
  maxAmbiguousGood: number;
  maxOperationsForDiscoverability: number;
}

export interface ScoringWeights {
  parameterSimplicity: number;
  schemaSimplicity: number;
  documentationQuality: number;
  constraintClarity: number;
  exampleCoverage: number;
  errorClarity: number;
  dependencyClarity: number;
  identifierClarity: number;
  polymorphismClarity: number;
  anyOfPenaltyMultiplier: number;
  discoverabilityWeight: number;
}

export interface ScoringConstants {
  thresholds: ScoringThresholds;
  weights: ScoringWeights;
  hotspotLimit: number;
}

export interface DebugSchemaEntry {
  ref: string | null;
  depth: number;
  propertyNames: string[];
  polymorphism: { oneOf?: number; anyOf?: number; allOf?: number };
  constraintCount: number;
}

export interface DebugMediaTypeLog {
  context: string;
  entries: DebugSchemaEntry[];
  totalProperties: number;
  totalPolymorphism: number;
  totalConstraints: number;
  maxDepth: number;
}

export interface SchemaStats {
  maxDepth: number;
  polymorphismCount: number;
  anyOfCount: number;
  hasDiscriminator: boolean;
  totalSchemaProperties: number;
  schemaPropertiesWithDescription: number;
  constraintCount: number;
  hasPropertyExamples: boolean;
  writableTopLevelFields: number;
  refsUsed: string[];
  debugEntries?: DebugSchemaEntry[];
}
