import { createConfig, type LoggerInterface } from '@redocly/openapi-core';
import { fileURLToPath } from 'node:url';

import { run, type RespectOptions } from '../run.js';

const SILENT_LOGGER: LoggerInterface = {
  info: () => {},
  warn: () => {},
  output: () => {},
  error: () => {},
  printNewLine: () => {},
  printSeparator: () => {},
  indent: (text) => text,
};

function jsonResponse(status: number, contentType: string, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

// the responses to the four requests of the `orders` workflow, in the order of its steps
function fetchCafe(): typeof globalThis.fetch {
  return vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      jsonResponse(201, 'application/json', { id: 'ord_1', customerName: 'Jane' })
    )
    .mockResolvedValueOnce(
      jsonResponse(400, 'application/problem+json', {
        title: 'Invalid order',
        cause: { title: 'A customer name is required' },
      })
    )
    .mockResolvedValueOnce(
      jsonResponse(404, 'application/problem+json', { title: 'Order not found', status: 404 })
    )
    .mockResolvedValueOnce(jsonResponse(200, 'application/json', {}));
}

async function runOptions(fileName: string): Promise<RespectOptions> {
  return {
    files: [fileURLToPath(new URL(fileName, import.meta.url))],
    config: await createConfig({}),
    maxSteps: 100,
    maxFetchTimeout: 40_000,
    requestFileLoader: { getFileBody: async () => new Blob() },
    logger: SILENT_LOGGER,
    fetch: fetchCafe(),
    coverage: true,
  };
}

describe('run with coverage', () => {
  it('measures what the steps sent and received against the API description', async () => {
    const [{ coverage = [] }] = await run(await runOptions('./coverage.arazzo.yaml'));

    // the `url` is the location of the description on this machine
    expect(coverage.map(({ name, totals, operations }) => ({ name, totals, operations })))
      .toMatchInlineSnapshot(`
      [
        {
          "name": "cafe-api",
          "operations": [
            {
              "covered": [
                {
                  "kind": "operation",
                },
                {
                  "in": "header",
                  "kind": "parameter",
                  "name": "X-Request-Id",
                },
                {
                  "kind": "property",
                  "path": "customerName",
                  "target": "request",
                },
                {
                  "kind": "property",
                  "path": "couponCode",
                  "target": "request",
                },
                {
                  "kind": "property",
                  "path": "comment",
                  "target": "request",
                },
                {
                  "kind": "response",
                  "status": "201",
                },
                {
                  "kind": "property",
                  "path": "id",
                  "status": "201",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "customerName",
                  "status": "201",
                  "target": "response",
                },
                {
                  "kind": "response",
                  "status": "4XX",
                },
                {
                  "kind": "property",
                  "path": "title",
                  "status": "4XX",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "cause",
                  "status": "4XX",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "cause.title",
                  "status": "4XX",
                  "target": "response",
                },
              ],
              "method": "POST",
              "missing": [
                {
                  "in": "query",
                  "kind": "parameter",
                  "name": "dryRun",
                },
                {
                  "kind": "property",
                  "path": "comment",
                  "status": "201",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "status",
                  "status": "4XX",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "cause.status",
                  "status": "4XX",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "cause.cause",
                  "status": "4XX",
                  "target": "response",
                },
              ],
              "operationId": "createOrder",
              "path": "/orders",
            },
            {
              "covered": [
                {
                  "kind": "operation",
                },
                {
                  "in": "path",
                  "kind": "parameter",
                  "name": "orderId",
                },
                {
                  "kind": "response",
                  "status": "default",
                },
                {
                  "kind": "property",
                  "path": "title",
                  "status": "default",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "status",
                  "status": "default",
                  "target": "response",
                },
              ],
              "method": "GET",
              "missing": [
                {
                  "kind": "response",
                  "status": "200",
                },
                {
                  "kind": "property",
                  "path": "id",
                  "status": "200",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "customerName",
                  "status": "200",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "comment",
                  "status": "200",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "cause",
                  "status": "default",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "cause.title",
                  "status": "default",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "cause.status",
                  "status": "default",
                  "target": "response",
                },
                {
                  "kind": "property",
                  "path": "cause.cause",
                  "status": "default",
                  "target": "response",
                },
              ],
              "operationId": "getOrderById",
              "path": "/orders/{orderId}",
            },
            {
              "covered": [],
              "method": "DELETE",
              "missing": [
                {
                  "kind": "operation",
                },
                {
                  "in": "path",
                  "kind": "parameter",
                  "name": "orderId",
                },
                {
                  "kind": "response",
                  "status": "204",
                },
              ],
              "operationId": "deleteOrder",
              "path": "/orders/{orderId}",
            },
          ],
          "totals": {
            "operations": {
              "covered": 2,
              "total": 3,
            },
            "parameters": {
              "covered": 2,
              "total": 4,
            },
            "properties": {
              "covered": 10,
              "total": 21,
            },
            "responses": {
              "covered": 3,
              "total": 5,
            },
          },
        },
      ]
    `);
  });

  it('measures the steps of a workflow from another Arazzo file', async () => {
    const [{ coverage }] = await run(await runOptions('./coverage-caller.arazzo.yaml'));

    expect(coverage).toMatchObject([
      {
        name: 'cafe-api',
        totals: {
          operations: { covered: 2, total: 3 },
          responses: { covered: 3, total: 5 },
        },
      },
    ]);
  });
});
