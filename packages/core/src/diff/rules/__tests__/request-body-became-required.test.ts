import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (required: boolean) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /orders:
      post:
        requestBody:
          required: ${required}
          content: { application/json: { schema: { type: object } } }
        responses:
          '201': { description: Created }
`;

describe('request-body-became-required', () => {
  it('should report an optional request body that became required', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(false), 'base.yaml'),
      revision: makeDocumentFromString(cafe(true), 'revision.yaml'),
      config: await createConfig({ diff: { 'request-body-became-required': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/required",
            "value": false,
          },
          "impact": "major",
          "key": "#/paths/~1orders/post/requestBody",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/required",
            "value": true,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1orders/post/requestBody/required",
              "message": "Request body became required.",
              "ruleId": "request-body-became-required",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a required request body that became optional', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(true), 'base.yaml'),
      revision: makeDocumentFromString(cafe(false), 'revision.yaml'),
      config: await createConfig({ diff: { 'request-body-became-required': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1orders/post/requestBody/required",
            "value": true,
          },
          "impact": "patch",
          "key": "#/paths/~1orders/post/requestBody",
          "kind": "modified",
          "property": "required",
          "revision": {
            "location": "revision.yaml#/paths/~1orders/post/requestBody/required",
            "value": false,
          },
          "verdicts": [],
        },
      ]
    `);
  });
});
