import { collectDocumentMetrics } from '../collect-metrics.js';
import { computeOperationSubscores, computeAgentReadiness } from '../scoring.js';

async function collect(doc: Record<string, unknown>) {
  return (await collectDocumentMetrics(doc)).metrics;
}

describe('example coverage', () => {
  function makeDocument(overrides: {
    requestExample?: boolean;
    responseExample?: boolean;
    hasRequestBody?: boolean;
  }) {
    const requestBody =
      overrides.hasRequestBody !== false
        ? {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { name: { type: 'string' } } },
                ...(overrides.requestExample ? { example: { name: 'test' } } : {}),
              },
            },
          }
        : undefined;

    return {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            description: 'Create an item',
            ...(requestBody ? { requestBody } : {}),
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { id: { type: 'string' } } },
                    ...(overrides.responseExample ? { example: { id: '123' } } : {}),
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  it('should give perfect example coverage when both request and response examples present', async () => {
    const doc = makeDocument({ requestExample: true, responseExample: true, hasRequestBody: true });
    const metrics = await collect(doc);
    const opMetrics = metrics.operations.get('createItem')!;

    expect(opMetrics.requestExamplePresent).toBe(true);
    expect(opMetrics.responseExamplePresent).toBe(true);

    const subscores = computeOperationSubscores(opMetrics, 0);
    expect(subscores.exampleCoverage).toBe(1);
  });

  it('should give half example coverage when only response example present', async () => {
    const doc = makeDocument({
      requestExample: false,
      responseExample: true,
      hasRequestBody: true,
    });
    const metrics = await collect(doc);
    const opMetrics = metrics.operations.get('createItem')!;

    expect(opMetrics.requestExamplePresent).toBe(false);
    expect(opMetrics.responseExamplePresent).toBe(true);

    const subscores = computeOperationSubscores(opMetrics, 0);
    expect(subscores.exampleCoverage).toBe(0.5);
  });

  it('should give zero example coverage when no examples', async () => {
    const doc = makeDocument({
      requestExample: false,
      responseExample: false,
      hasRequestBody: true,
    });
    const metrics = await collect(doc);
    const opMetrics = metrics.operations.get('createItem')!;

    const subscores = computeOperationSubscores(opMetrics, 0);
    expect(subscores.exampleCoverage).toBe(0);
  });

  it('should affect agent readiness score positively with examples', async () => {
    const docWith = makeDocument({
      requestExample: true,
      responseExample: true,
      hasRequestBody: true,
    });
    const docWithout = makeDocument({
      requestExample: false,
      responseExample: false,
      hasRequestBody: true,
    });

    const metricsWithExamples = (await collect(docWith)).operations.get('createItem')!;
    const metricsWithout = (await collect(docWithout)).operations.get('createItem')!;

    const subWith = computeOperationSubscores(metricsWithExamples, 0);
    const subWithout = computeOperationSubscores(metricsWithout, 0);

    const scoreWith = computeAgentReadiness(subWith);
    const scoreWithout = computeAgentReadiness(subWithout);

    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });

  it('should handle examples via examples map', async () => {
    const doc = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/json': {
                  schema: { type: 'object' },
                  examples: {
                    sample: { value: { name: 'test' } },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                    examples: {
                      result: { value: { id: '1' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const metrics = await collect(doc);
    const opMetrics = metrics.operations.get('createItem')!;
    expect(opMetrics.requestExamplePresent).toBe(true);
    expect(opMetrics.responseExamplePresent).toBe(true);
  });
});
