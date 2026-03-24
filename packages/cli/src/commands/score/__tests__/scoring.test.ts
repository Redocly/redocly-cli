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
      const metrics = {
        operationCount: 2,
        operations: new Map([
          [
            'getA',
            makeBaseMetrics({
              path: '/a',
              method: 'get',
              operationId: 'getA',
              parameterCount: 1,
              requiredParameterCount: 1,
              paramsWithDescription: 0,
              propertyCount: 1,
              totalSchemaProperties: 1,
              maxResponseSchemaDepth: 1,
            }),
          ],
          [
            'createB',
            makeBaseMetrics({
              path: '/b',
              method: 'post',
              operationId: 'createB',
              requestBodyPresent: true,
              requestExamplePresent: true,
              constraintCount: 1,
              propertyCount: 2,
              totalSchemaProperties: 2,
              maxRequestSchemaDepth: 1,
              maxResponseSchemaDepth: 1,
              structuredErrorResponseCount: 1,
              totalErrorResponses: 1,
            }),
          ],
        ]),
      };

      const depths = new Map<string, number>([
        ['getA', 0],
        ['createB', 0],
      ]);

      const scores1 = computeAllOperationScores(metrics, depths);
      const scores2 = computeAllOperationScores(metrics, depths);

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

  describe('example coverage', () => {
    it('should give full example coverage when both request and response examples present', () => {
      const metrics = makeBaseMetrics({
        requestBodyPresent: true,
        requestExamplePresent: true,
        responseExamplePresent: true,
      });
      const sub = computeOperationIntegrationSubscores(metrics, 0);
      expect(sub.exampleCoverage).toBe(1);
    });

    it('should give full example coverage when no body and response example present', () => {
      const metrics = makeBaseMetrics({
        requestBodyPresent: false,
        requestExamplePresent: false,
        responseExamplePresent: true,
      });
      const sub = computeOperationIntegrationSubscores(metrics, 0);
      expect(sub.exampleCoverage).toBe(1);
    });

    it('should give 50% when request body present but only response example', () => {
      const metrics = makeBaseMetrics({
        requestBodyPresent: true,
        requestExamplePresent: false,
        responseExamplePresent: true,
      });
      const sub = computeOperationIntegrationSubscores(metrics, 0);
      expect(sub.exampleCoverage).toBe(0.5);
    });
  });

  describe('error clarity', () => {
    it('should give full score when all errors are structured', () => {
      const metrics = makeBaseMetrics({
        structuredErrorResponseCount: 3,
        totalErrorResponses: 3,
      });
      const sub = computeOperationIntegrationSubscores(metrics, 0);
      expect(sub.errorClarity).toBe(1);
    });

    it('should give full score when there are no error responses', () => {
      const metrics = makeBaseMetrics({
        structuredErrorResponseCount: 0,
        totalErrorResponses: 0,
      });
      const sub = computeOperationIntegrationSubscores(metrics, 0);
      expect(sub.errorClarity).toBe(1);
    });

    it('should give 0 when no errors are structured', () => {
      const metrics = makeBaseMetrics({
        structuredErrorResponseCount: 0,
        totalErrorResponses: 2,
      });
      const sub = computeOperationIntegrationSubscores(metrics, 0);
      expect(sub.errorClarity).toBe(0);
    });
  });

  describe('documentation quality', () => {
    it('should give full score when all items have descriptions', () => {
      const metrics = makeBaseMetrics({
        operationDescriptionPresent: true,
        parameterCount: 2,
        paramsWithDescription: 2,
        totalSchemaProperties: 3,
        schemaPropertiesWithDescription: 3,
      });
      const sub = computeOperationIntegrationSubscores(metrics, 0);
      expect(sub.documentationQuality).toBe(1);
    });

    it('should give full score when there are no params or properties', () => {
      const metrics = makeBaseMetrics({
        operationDescriptionPresent: true,
        parameterCount: 0,
        paramsWithDescription: 0,
        totalSchemaProperties: 0,
        schemaPropertiesWithDescription: 0,
      });
      const sub = computeOperationIntegrationSubscores(metrics, 0);
      expect(sub.documentationQuality).toBe(1);
    });
  });

  describe('workflow clarity', () => {
    it('should give full score with 0 workflow depth', () => {
      const metrics = makeBaseMetrics();
      const sub = computeOperationIntegrationSubscores(metrics, 0);
      expect(sub.workflowClarity).toBe(1);
    });

    it('should decrease with higher workflow depth', () => {
      const metrics = makeBaseMetrics();
      const sub0 = computeOperationIntegrationSubscores(metrics, 0);
      const sub3 = computeOperationIntegrationSubscores(metrics, 3);
      expect(sub0.workflowClarity).toBeGreaterThan(sub3.workflowClarity);
    });
  });

  describe('agent-specific subscores', () => {
    it('should give full identifier clarity with no ambiguous identifiers', () => {
      const metrics = makeBaseMetrics({ ambiguousIdentifierCount: 0 });
      const sub = computeOperationAgentSubscores(metrics, 0);
      expect(sub.identifierClarity).toBe(1);
    });

    it('should decrease identifier clarity with ambiguous identifiers', () => {
      const metrics = makeBaseMetrics({ ambiguousIdentifierCount: 3 });
      const sub = computeOperationAgentSubscores(metrics, 0);
      expect(sub.identifierClarity).toBe(0);
    });

    it('should give full polymorphism clarity with no polymorphism', () => {
      const metrics = makeBaseMetrics({ polymorphismCount: 0, anyOfCount: 0 });
      const sub = computeOperationAgentSubscores(metrics, 0);
      expect(sub.polymorphismClarity).toBe(1);
    });
  });

  describe('computeAllOperationScores', () => {
    it('should compute scores for all operations', () => {
      const doc = {
        operationCount: 2,
        operations: new Map([
          ['op1', makeBaseMetrics()],
          ['op2', makeBaseMetrics({ parameterCount: 10 })],
        ]),
      };
      const depths = new Map([
        ['op1', 0],
        ['op2', 1],
      ]);
      const result = computeAllOperationScores(doc, depths);
      expect(result.size).toBe(2);
      expect(result.get('op1')!.integrationSimplicity).toBeGreaterThan(
        result.get('op2')!.integrationSimplicity
      );
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
