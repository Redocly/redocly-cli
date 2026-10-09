import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges, resolverWithFiles } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString, type Document } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (responses: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders/{orderId}:
      get:
        parameters:
          - { name: orderId, in: path, required: true, schema: { type: string } }
        responses: ${responses}
`;

describe('response-removed', () => {
  it('should report a response that is gone', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(
        cafe("{ '200': { description: OK }, '404': { description: Not found } }"),
        'base.yaml'
      ),
      revision: makeDocumentFromString(cafe("{ '200': { description: OK } }"), 'revision.yaml'),
      config: await createConfig({ diff: { 'response-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders~1{orderId}/get/responses/404",
            "value": {
              "description": "Not found",
            },
          },
          "impact": "major",
          "key": "#/paths/~1orders~1{orderId}/get/responses/404",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1orders~1{orderId}/get/responses/404",
              "message": "Response \`404\` was removed.",
              "ruleId": "response-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a response that became another status code', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe("{ '200': { description: OK } }"), 'base.yaml'),
      revision: makeDocumentFromString(cafe("{ '204': { description: OK } }"), 'revision.yaml'),
      config: await createConfig({ diff: { 'response-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders~1{orderId}/get/responses/200",
            "value": "200",
          },
          "impact": "major",
          "key": "#/paths/~1orders~1{orderId}/get/responses/204",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "revision.yaml#/paths/~1orders~1{orderId}/get/responses/204",
            "value": "204",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders~1{orderId}/get/responses/204",
              "message": "Response \`200\` became \`204\`.",
              "ruleId": "response-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a removed component response, which no operation returns', async () => {
    const withComponents = (components: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          get:
            responses:
              '200': { description: OK }
      components:
        responses: ${components}
    `;
    const result = await diffDocuments({
      base: makeDocumentFromString(
        withComponents('{ NotFound: { description: Not found } }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(withComponents('{}'), 'revision.yaml'),
      config: await createConfig({ diff: { 'response-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/responses/NotFound",
            "value": {
              "description": "Not found",
            },
          },
          "impact": "patch",
          "key": "#/components/responses/NotFound",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });

  it('should name a removed response by its own code when it points at a response in another file', async () => {
    const failed = "{ $ref: '#/components/responses/Failed' }";
    const orders = (responses: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          post:
            responses: ${responses}
      components:
        responses:
          Failed: { $ref: failed.yaml }
    `;
    const resolver = resolverWithFiles({
      'failed.yaml': 'description: Failed',
      'base.yaml': orders(`{ '400': ${failed}, '500': ${failed} }`),
      'revision.yaml': orders(`{ '400': ${failed} }`),
    });
    const [base, revision] = (await Promise.all(
      ['base.yaml', 'revision.yaml'].map((file) => resolver.resolveDocument(null, file, true))
    )) as Document[];

    const result = await diffDocuments({
      base,
      revision,
      config: await createConfig({ diff: { 'response-removed': 'major' } }),
      externalRefResolver: resolver,
    });

    expect(
      result.changes.flatMap(({ verdicts }) => verdicts.map(({ message }) => message))
    ).toEqual(['Response `500` was removed.']);
  });
});
