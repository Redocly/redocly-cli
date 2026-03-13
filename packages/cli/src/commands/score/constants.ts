import type { ScoringConstants } from './types.js';

export const DEFAULT_SCORING_CONSTANTS: ScoringConstants = {
  thresholds: {
    maxParamsGood: 5,
    maxDepthGood: 4,
    maxPolymorphismGood: 2,
    maxPropertiesGood: 20,
    maxWorkflowDepthGood: 3,
    maxAmbiguousGood: 0,
  },
  weights: {
    integration: {
      parameterSimplicity: 0.2,
      schemaSimplicity: 0.2,
      documentationQuality: 0.15,
      constraintClarity: 0.1,
      exampleCoverage: 0.15,
      errorClarity: 0.1,
      workflowClarity: 0.1,
    },
    agent: {
      documentationQuality: 0.2,
      constraintClarity: 0.15,
      exampleCoverage: 0.2,
      errorClarity: 0.15,
      identifierClarity: 0.1,
      workflowClarity: 0.1,
      polymorphismClarity: 0.1,
    },
    anyOfPenaltyMultiplier: 2.0,
  },
  hotspotLimit: 10,
};

export const AMBIGUOUS_PARAM_NAMES = new Set([
  'id',
  'name',
  'type',
  'value',
  'data',
  'key',
  'status',
  'state',
  'code',
  'result',
  'item',
  'object',
  'resource',
  'entity',
  'input',
  'output',
  'payload',
  'body',
  'content',
  'info',
]);
