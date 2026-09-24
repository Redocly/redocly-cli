import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (content: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /menu:
      get:
        responses:
          '200':
            description: OK
            content: ${content}
`;

const json = 'application/json: { schema: { type: array } }';
const csv = 'text/csv: { schema: { type: string } }';

describe('media-type-removed', () => {
  it('should report a media type that is gone', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${json}, ${csv} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${json} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'media-type-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/responses/200/content/text~1csv",
            "value": {
              "schema": {
                "type": "string",
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/responses/200/content/text~1csv",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1menu/get/responses/200/content/text~1csv",
              "message": "Media type was removed.",
              "ruleId": "media-type-removed",
            },
          ],
        },
      ]
    `);
  });
});
