import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (paths: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths: ${paths}
`;

const menu = '/menu: { get: { responses: { 200: { description: OK } } } }';
const revenue = '/revenue: { get: { responses: { 200: { description: OK } } } }';

describe('path-removed', () => {
  it('should report a path that is gone', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${menu}, ${revenue} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${menu} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'path-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1revenue",
            "value": {
              "get": {
                "responses": {
                  "200": {
                    "description": "OK",
                  },
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1revenue",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1revenue",
              "message": "Path was removed.",
              "ruleId": "path-removed",
            },
          ],
        },
      ]
    `);
  });
});
