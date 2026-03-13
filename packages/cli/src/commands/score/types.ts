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
  propertyCount: number;

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

export interface IntegrationSimplicitySubscores {
  parameterSimplicity: number;
  schemaSimplicity: number;
  documentationQuality: number;
  constraintClarity: number;
  exampleCoverage: number;
  errorClarity: number;
  workflowClarity: number;
}

export interface AgentReadinessSubscores {
  documentationQuality: number;
  constraintClarity: number;
  exampleCoverage: number;
  errorClarity: number;
  identifierClarity: number;
  workflowClarity: number;
  polymorphismClarity: number;
}

export interface OperationScores {
  integrationSimplicity: number;
  agentReadiness: number;
  integrationSubscores: IntegrationSimplicitySubscores;
  agentSubscores: AgentReadinessSubscores;
}

export interface HotspotOperation {
  path: string;
  method: string;
  operationId?: string;
  integrationSimplicityScore: number;
  agentReadinessScore: number;
  reasons: string[];
}

export interface ScoreResult {
  integrationSimplicity: number;
  agentReadiness: number;
  integrationSubscores: IntegrationSimplicitySubscores;
  agentSubscores: AgentReadinessSubscores;
  rawMetrics: DocumentMetrics;
  hotspots: HotspotOperation[];
  operationScores: Map<string, OperationScores>;
  workflowDepths: Map<string, number>;
}

export interface ScoringThresholds {
  maxParamsGood: number;
  maxDepthGood: number;
  maxPolymorphismGood: number;
  maxPropertiesGood: number;
  maxWorkflowDepthGood: number;
  maxAmbiguousGood: number;
}

export interface ScoringWeights {
  integration: {
    parameterSimplicity: number;
    schemaSimplicity: number;
    documentationQuality: number;
    constraintClarity: number;
    exampleCoverage: number;
    errorClarity: number;
    workflowClarity: number;
  };
  agent: {
    documentationQuality: number;
    constraintClarity: number;
    exampleCoverage: number;
    errorClarity: number;
    identifierClarity: number;
    workflowClarity: number;
    polymorphismClarity: number;
  };
  anyOfPenaltyMultiplier: number;
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
