import { collectDocumentMetrics } from '../collectors/document-metrics.js';
import { DEFAULT_SCORING_CONSTANTS } from '../constants.js';
import {
  computeOperationIntegrationSubscores,
  computeOperationAgentSubscores,
  computeIntegrationSimplicity,
  computeAgentReadiness,
  computeAllOperationScores,
  computeDocumentScores,
} from '../scoring.js';
import type { OperationMetrics, ScoringConstants } from '../types.js';

function makeBaseMetrics(overrides: Partial<OperationMetrics> = {}): OperationMetrics {
  return {
    path: '/test',
    method: 'get',
    operationId: 'testOp',
    parameterCount: 0,
    requiredParameterCount: 0,
    paramsWithDescription: 0,
    requestBodyPresent: false,
    topLevelWritableFieldCount: 0,
    maxRequestSchemaDepth: 0,
    maxResponseSchemaDepth: 0,
    polymorphismCount: 0,
    anyOfCount: 0,
    hasDiscriminator: false,
    propertyCount: 0,
    operationDescriptionPresent: true,
    schemaPropertiesWithDescription: 0,
    totalSchemaProperties: 0,
    constraintCount: 0,
    requestExamplePresent: false,
    responseExamplePresent: true,
    structuredErrorResponseCount: 0,
    totalErrorResponses: 0,
    ambiguousIdentifierCount: 0,
    refsUsed: new Set(),
    ...overrides,
  };
}

describe('scoring', () => {
  describe('depth normalization', () => {
    it('should give high schema simplicity for shallow schemas', () => {
      const metrics = makeBaseMetrics({ maxRequestSchemaDepth: 1, maxResponseSchemaDepth: 1 });
      const subscores = computeOperationIntegrationSubscores(metrics, 0);
      expect(subscores.schemaSimplicity).toBeGreaterThan(0.8);
    });

    it('should give lower schema simplicity for deep schemas', () => {
      const metrics = makeBaseMetrics({ maxRequestSchemaDepth: 8, maxResponseSchemaDepth: 6 });
      const subscores = computeOperationIntegrationSubscores(metrics, 0);
      expect(subscores.schemaSimplicity).toBeLessThan(0.5);
    });

    it('should clamp schema simplicity at 0 for extremely deep schemas', () => {
      const metrics = makeBaseMetrics({ maxRequestSchemaDepth: 20, maxResponseSchemaDepth: 20 });
      const subscores = computeOperationIntegrationSubscores(metrics, 0);
      expect(subscores.schemaSimplicity).toBe(0);
    });
  });

  describe('polymorphism penalties', () => {
    it('should penalize anyOf more than oneOf', () => {
      const metricsAnyOf = makeBaseMetrics({
        polymorphismCount: 3,
        anyOfCount: 3,
      });
      const metricsOneOf = makeBaseMetrics({
        polymorphismCount: 3,
        anyOfCount: 0,
      });

      const subAnyOf = computeOperationIntegrationSubscores(metricsAnyOf, 0);
      const subOneOf = computeOperationIntegrationSubscores(metricsOneOf, 0);

      expect(subAnyOf.schemaSimplicity).toBeLessThan(subOneOf.schemaSimplicity);
    });

    it('should apply anyOfPenaltyMultiplier from constants', () => {
      const metrics = makeBaseMetrics({ polymorphismCount: 2, anyOfCount: 2 });
      const lowPenalty: ScoringConstants = {
        ...DEFAULT_SCORING_CONSTANTS,
        weights: {
          ...DEFAULT_SCORING_CONSTANTS.weights,
          anyOfPenaltyMultiplier: 1.0,
        },
      };
      const highPenalty: ScoringConstants = {
        ...DEFAULT_SCORING_CONSTANTS,
        weights: {
          ...DEFAULT_SCORING_CONSTANTS.weights,
          anyOfPenaltyMultiplier: 5.0,
        },
      };

      const subLow = computeOperationIntegrationSubscores(metrics, 0, lowPenalty);
      const subHigh = computeOperationIntegrationSubscores(metrics, 0, highPenalty);

      expect(subLow.schemaSimplicity).toBeGreaterThan(subHigh.schemaSimplicity);
    });

    it('should give higher agent polymorphism clarity when discriminator is present', () => {
      const withDisc = makeBaseMetrics({
        polymorphismCount: 4,
        anyOfCount: 2,
        hasDiscriminator: true,
      });
      const withoutDisc = makeBaseMetrics({
        polymorphismCount: 4,
        anyOfCount: 2,
        hasDiscriminator: false,
      });

      const subWith = computeOperationAgentSubscores(withDisc, 0);
      const subWithout = computeOperationAgentSubscores(withoutDisc, 0);

      expect(subWith.polymorphismClarity).toBeGreaterThan(subWithout.polymorphismClarity);
    });
  });

  describe('determinism', () => {
    it('should produce identical scores for the same input', () => {
      const doc = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/a': {
            get: {
              operationId: 'getA',
              description: 'Get A',
              parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string' } }],
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: { type: 'object', properties: { name: { type: 'string' } } },
                    },
                  },
                },
              },
            },
          },
          '/b': {
            post: {
              operationId: 'createB',
              description: 'Create B',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        value: { type: 'string', minLength: 1 },
                      },
                    },
                    example: { value: 'test' },
                  },
                },
              },
              responses: {
                '201': {
                  description: 'Created',
                  content: {
                    'application/json': {
                      schema: { type: 'object', properties: { id: { type: 'string' } } },
                      example: { id: '1' },
                    },
                  },
                },
                '400': {
                  description: 'Bad Request',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: { message: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const metrics1 = collectDocumentMetrics(doc);
      const metrics2 = collectDocumentMetrics(doc);

      const depths1 = new Map(Array.from(metrics1.operations.keys()).map((k) => [k, 0]));
      const depths2 = new Map(Array.from(metrics2.operations.keys()).map((k) => [k, 0]));

      const scores1 = computeAllOperationScores(metrics1, depths1);
      const scores2 = computeAllOperationScores(metrics2, depths2);

      const doc1 = computeDocumentScores(scores1);
      const doc2 = computeDocumentScores(scores2);

      expect(doc1.integrationSimplicity).toBe(doc2.integrationSimplicity);
      expect(doc1.agentReadiness).toBe(doc2.agentReadiness);

      for (const [key, s1] of scores1) {
        const s2 = scores2.get(key)!;
        expect(s1.integrationSimplicity).toBe(s2.integrationSimplicity);
        expect(s1.agentReadiness).toBe(s2.agentReadiness);
      }
    });
  });

  describe('composite scores', () => {
    it('should produce scores in 0-100 range', () => {
      const metrics = makeBaseMetrics({
        parameterCount: 10,
        maxRequestSchemaDepth: 5,
        polymorphismCount: 3,
        anyOfCount: 2,
      });
      const intSub = computeOperationIntegrationSubscores(metrics, 2);
      const agentSub = computeOperationAgentSubscores(metrics, 2);
      const intScore = computeIntegrationSimplicity(intSub);
      const agentScore = computeAgentReadiness(agentSub);

      expect(intScore).toBeGreaterThanOrEqual(0);
      expect(intScore).toBeLessThanOrEqual(100);
      expect(agentScore).toBeGreaterThanOrEqual(0);
      expect(agentScore).toBeLessThanOrEqual(100);
    });

    it('should return 100/100 for an empty document', () => {
      const opScores = new Map();
      const { integrationSimplicity, agentReadiness } = computeDocumentScores(opScores);
      expect(integrationSimplicity).toBe(100);
      expect(agentReadiness).toBe(100);
    });

    it('should return higher scores for well-documented API', () => {
      const good = makeBaseMetrics({
        operationDescriptionPresent: true,
        paramsWithDescription: 3,
        parameterCount: 3,
        schemaPropertiesWithDescription: 5,
        totalSchemaProperties: 5,
        constraintCount: 5,
        requestExamplePresent: true,
        responseExamplePresent: true,
        requestBodyPresent: true,
        structuredErrorResponseCount: 2,
        totalErrorResponses: 2,
      });
      const bad = makeBaseMetrics({
        operationDescriptionPresent: false,
        paramsWithDescription: 0,
        parameterCount: 8,
        schemaPropertiesWithDescription: 0,
        totalSchemaProperties: 10,
        constraintCount: 0,
        requestExamplePresent: false,
        responseExamplePresent: false,
        requestBodyPresent: true,
        maxRequestSchemaDepth: 6,
        polymorphismCount: 5,
        anyOfCount: 3,
        structuredErrorResponseCount: 0,
        totalErrorResponses: 3,
        ambiguousIdentifierCount: 4,
      });

      const goodIntSub = computeOperationIntegrationSubscores(good, 0);
      const badIntSub = computeOperationIntegrationSubscores(bad, 3);
      expect(computeIntegrationSimplicity(goodIntSub)).toBeGreaterThan(
        computeIntegrationSimplicity(badIntSub)
      );

      const goodAgentSub = computeOperationAgentSubscores(good, 0);
      const badAgentSub = computeOperationAgentSubscores(bad, 3);
      expect(computeAgentReadiness(goodAgentSub)).toBeGreaterThan(
        computeAgentReadiness(badAgentSub)
      );
    });
  });
});
