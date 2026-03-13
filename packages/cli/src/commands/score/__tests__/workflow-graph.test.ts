import { computeWorkflowDepths } from '../collectors/workflow-graph.js';
import type { OperationMetrics } from '../types.js';

function makeOp(path: string, method: string, refs: string[]): OperationMetrics {
  return {
    path,
    method,
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
    operationDescriptionPresent: false,
    schemaPropertiesWithDescription: 0,
    totalSchemaProperties: 0,
    constraintCount: 0,
    requestExamplePresent: false,
    responseExamplePresent: false,
    structuredErrorResponseCount: 0,
    totalErrorResponses: 0,
    ambiguousIdentifierCount: 0,
    refsUsed: new Set(refs),
  };
}

describe('computeWorkflowDepths', () => {
  it('returns depth 0 for isolated operations', () => {
    const ops = new Map([
      ['opA', makeOp('/a', 'get', ['#/components/schemas/A'])],
      ['opB', makeOp('/b', 'get', ['#/components/schemas/B'])],
    ]);
    const depths = computeWorkflowDepths(ops);
    expect(depths.get('opA')).toBe(0);
    expect(depths.get('opB')).toBe(0);
  });

  it('returns depth 1 for two operations sharing a ref', () => {
    const shared = '#/components/schemas/Shared';
    const ops = new Map([
      ['opA', makeOp('/a', 'get', [shared])],
      ['opB', makeOp('/b', 'post', [shared])],
    ]);
    const depths = computeWorkflowDepths(ops);
    expect(depths.get('opA')).toBe(1);
    expect(depths.get('opB')).toBe(1);
  });

  it('returns depth 2 for a linear chain A-B-C', () => {
    const ops = new Map([
      ['opA', makeOp('/a', 'get', ['#/schemas/AB'])],
      ['opB', makeOp('/b', 'post', ['#/schemas/AB', '#/schemas/BC'])],
      ['opC', makeOp('/c', 'put', ['#/schemas/BC'])],
    ]);
    const depths = computeWorkflowDepths(ops);
    expect(depths.get('opA')).toBe(2);
    expect(depths.get('opC')).toBe(2);
    expect(depths.get('opB')).toBeLessThanOrEqual(2);
  });

  it('handles empty operations map', () => {
    const depths = computeWorkflowDepths(new Map());
    expect(depths.size).toBe(0);
  });

  it('handles operations with no refs', () => {
    const ops = new Map([['opA', makeOp('/a', 'get', [])]]);
    const depths = computeWorkflowDepths(ops);
    expect(depths.get('opA')).toBe(0);
  });

  it('groups all operations sharing the same ref', () => {
    const shared = '#/components/schemas/Common';
    const ops = new Map([
      ['opA', makeOp('/a', 'get', [shared])],
      ['opB', makeOp('/b', 'post', [shared])],
      ['opC', makeOp('/c', 'put', [shared])],
    ]);
    const depths = computeWorkflowDepths(ops);
    expect(depths.get('opA')).toBe(1);
    expect(depths.get('opB')).toBe(1);
    expect(depths.get('opC')).toBe(1);
  });
});
