import { printScoreJson } from '../formatters/json.js';
import { printScoreStylish } from '../formatters/stylish.js';
import type { ScoreResult } from '../types.js';

vi.mock('@redocly/openapi-core', () => ({
  logger: { output: vi.fn() },
}));

import { logger } from '@redocly/openapi-core';
const mockOutput = vi.mocked(logger.output);

function makeResult(overrides: Partial<ScoreResult> = {}): ScoreResult {
  return {
    integrationSimplicity: 75,
    agentReadiness: 60,
    integrationSubscores: {
      parameterSimplicity: 0.8,
      schemaSimplicity: 0.7,
      documentationQuality: 0.9,
      constraintClarity: 0.5,
      exampleCoverage: 0.6,
      errorClarity: 1.0,
      workflowClarity: 0.8,
    },
    agentSubscores: {
      documentationQuality: 0.9,
      constraintClarity: 0.5,
      exampleCoverage: 0.6,
      errorClarity: 1.0,
      identifierClarity: 0.8,
      workflowClarity: 0.8,
      polymorphismClarity: 1.0,
    },
    rawMetrics: {
      operationCount: 2,
      operations: new Map([
        [
          'getItems',
          {
            path: '/items',
            method: 'get',
            operationId: 'getItems',
            parameterCount: 2,
            requiredParameterCount: 0,
            paramsWithDescription: 1,
            requestBodyPresent: false,
            topLevelWritableFieldCount: 0,
            maxRequestSchemaDepth: 0,
            maxResponseSchemaDepth: 2,
            polymorphismCount: 0,
            anyOfCount: 0,
            hasDiscriminator: false,
            propertyCount: 3,
            operationDescriptionPresent: true,
            schemaPropertiesWithDescription: 2,
            totalSchemaProperties: 3,
            constraintCount: 1,
            requestExamplePresent: false,
            responseExamplePresent: true,
            structuredErrorResponseCount: 1,
            totalErrorResponses: 1,
            ambiguousIdentifierCount: 0,
            refsUsed: new Set(),
          },
        ],
        [
          'createItem',
          {
            path: '/items',
            method: 'post',
            operationId: 'createItem',
            parameterCount: 0,
            requiredParameterCount: 0,
            paramsWithDescription: 0,
            requestBodyPresent: true,
            topLevelWritableFieldCount: 3,
            maxRequestSchemaDepth: 1,
            maxResponseSchemaDepth: 1,
            polymorphismCount: 0,
            anyOfCount: 0,
            hasDiscriminator: false,
            propertyCount: 5,
            operationDescriptionPresent: false,
            schemaPropertiesWithDescription: 2,
            totalSchemaProperties: 5,
            constraintCount: 2,
            requestExamplePresent: true,
            responseExamplePresent: true,
            structuredErrorResponseCount: 1,
            totalErrorResponses: 1,
            ambiguousIdentifierCount: 0,
            refsUsed: new Set(),
          },
        ],
      ]),
    },
    hotspots: [
      {
        path: '/items',
        method: 'post',
        operationId: 'createItem',
        integrationSimplicityScore: 65,
        agentReadinessScore: 55,
        reasons: ['Missing operation description'],
      },
    ],
    operationScores: new Map(),
    workflowDepths: new Map(),
    ...overrides,
  };
}

describe('printScoreStylish', () => {
  beforeEach(() => {
    mockOutput.mockClear();
  });

  it('outputs main scores', () => {
    printScoreStylish(makeResult());
    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Integration Simplicity');
    expect(output).toContain('Agent Readiness');
  });

  it('outputs subscores', () => {
    printScoreStylish(makeResult());
    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Parameter Simplicity');
    expect(output).toContain('Schema Simplicity');
    expect(output).toContain('Documentation Quality');
    expect(output).toContain('Identifier Clarity');
    expect(output).toContain('Polymorphism Clarity');
  });

  it('outputs raw metrics summary', () => {
    printScoreStylish(makeResult());
    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Total operations: 2');
    expect(output).toContain('Avg parameters/operation');
  });

  it('outputs hotspots', () => {
    printScoreStylish(makeResult());
    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Hotspot Operations');
    expect(output).toContain('POST /items');
    expect(output).toContain('Missing operation description');
  });

  it('outputs no hotspot message when empty', () => {
    printScoreStylish(makeResult({ hotspots: [] }));
    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('No hotspot operations found');
  });

  it('handles zero operations in raw metrics', () => {
    printScoreStylish(
      makeResult({
        rawMetrics: { operationCount: 0, operations: new Map() },
        hotspots: [],
      })
    );
    const output = mockOutput.mock.calls.map(([s]: [string]) => s).join('');
    expect(output).toContain('Total operations: 0');
    expect(output).not.toContain('Avg parameters');
  });

  it('appends newline to every output call', () => {
    printScoreStylish(makeResult());
    for (const call of mockOutput.mock.calls) {
      expect(call[0]).toMatch(/\n$/);
    }
  });
});

describe('printScoreJson', () => {
  beforeEach(() => {
    mockOutput.mockClear();
  });

  it('outputs valid JSON', () => {
    printScoreJson(makeResult());
    const output = mockOutput.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.integrationSimplicity).toBe(75);
    expect(parsed.agentReadiness).toBe(60);
  });

  it('includes operations as plain object', () => {
    printScoreJson(makeResult());
    const parsed = JSON.parse(mockOutput.mock.calls[0][0]);
    expect(parsed.rawMetrics.operations.getItems).toBeDefined();
    expect(parsed.rawMetrics.operations.getItems.path).toBe('/items');
  });

  it('includes hotspots', () => {
    printScoreJson(makeResult());
    const parsed = JSON.parse(mockOutput.mock.calls[0][0]);
    expect(parsed.hotspots.length).toBe(1);
    expect(parsed.hotspots[0].reasons).toContain('Missing operation description');
  });

  it('includes subscores', () => {
    printScoreJson(makeResult());
    const parsed = JSON.parse(mockOutput.mock.calls[0][0]);
    expect(parsed.integrationSubscores.parameterSimplicity).toBe(0.8);
    expect(parsed.agentSubscores.polymorphismClarity).toBe(1.0);
  });

  it('includes workflow depths as object', () => {
    const result = makeResult();
    result.workflowDepths = new Map([
      ['opA', 2],
      ['opB', 0],
    ]);
    printScoreJson(result);
    const parsed = JSON.parse(mockOutput.mock.calls[0][0]);
    expect(parsed.workflowDepths.opA).toBe(2);
    expect(parsed.workflowDepths.opB).toBe(0);
  });
});
