import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (content?: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /menu:
      get:
        responses:
          '200':
            description: OK
            ${content === undefined ? '' : `content: ${content}`}
`;

const json = 'application/json: { schema: { type: array } }';
const csv = 'text/csv: { schema: { type: string } }';

describe('media-type-removed', () => {
  it('should report a media type that is gone', async () => {
    const result = await diffDocuments({
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
              "message": "Media type \`text/csv\` was removed.",
              "ruleId": "media-type-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report every media type leaving with the whole content map', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${json} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(), 'revision.yaml'),
      config: await createConfig({ diff: { 'media-type-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/responses/200/content",
            "value": {
              "application/json": {
                "schema": {
                  "type": "array",
                },
              },
            },
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/responses/200/content",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/paths/~1menu/get/responses/200/content",
              "message": "All media types were removed.",
              "ruleId": "media-type-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a media type replaced by another', async () => {
    const xml = 'application/xml: { schema: { type: array } }';
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${json} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${xml} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'media-type-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/paths/~1menu/get/responses/200/content/application~1json",
            "value": "application/json",
          },
          "impact": "major",
          "key": "#/paths/~1menu/get/responses/200/content/application~1xml",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "revision.yaml#/paths/~1menu/get/responses/200/content/application~1xml",
            "value": "application/xml",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/paths/~1menu/get/responses/200/content/application~1xml",
              "message": "Media type \`application/json\` became \`application/xml\`.",
              "ruleId": "media-type-removed",
            },
          ],
        },
      ]
    `);
  });

  it('should not report a media type of a component response nothing references', async () => {
    const withComponent = (content: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths: {}
      components:
        responses:
          Unused:
            description: OK
            content: ${content}
    `;
    const plain = 'text/plain: { schema: { type: string } }';
    const xml = 'application/xml: { schema: { type: array } }';

    const result = await diffDocuments({
      base: makeDocumentFromString(withComponent(`{ ${json}, ${plain} }`), 'base.yaml'),
      revision: makeDocumentFromString(withComponent(`{ ${xml} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'media-type-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/responses/Unused/content/application~1json",
            "value": "application/json",
          },
          "impact": "patch",
          "key": "#/components/responses/Unused/content/application~1xml",
          "kind": "modified",
          "property": "key",
          "revision": {
            "location": "revision.yaml#/components/responses/Unused/content/application~1xml",
            "value": "application/xml",
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/components/responses/Unused/content/text~1plain",
            "value": {
              "schema": {
                "type": "string",
              },
            },
          },
          "impact": "patch",
          "key": "#/components/responses/Unused/content/text~1plain",
          "kind": "removed",
          "verdicts": [],
        },
      ]
    `);
  });
});
