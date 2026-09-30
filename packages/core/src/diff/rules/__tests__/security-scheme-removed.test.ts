import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (schemes: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths: {}
  components:
    securitySchemes: ${schemes}
`;

const apiKey = 'ApiKey: { type: apiKey, in: header, name: X-Api-Key }';
const bearer = 'Bearer: { type: http, scheme: bearer }';

describe('security-scheme-removed', () => {
  it('should report a security scheme that is gone', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${apiKey}, ${bearer} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${apiKey} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'security-scheme-removed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/securitySchemes/Bearer",
            "value": {
              "scheme": "bearer",
              "type": "http",
            },
          },
          "impact": "major",
          "key": "#/components/securitySchemes/Bearer",
          "kind": "removed",
          "verdicts": [
            {
              "impact": "major",
              "location": "base.yaml#/components/securitySchemes/Bearer",
              "message": "Security scheme \`Bearer\` was removed.",
              "ruleId": "security-scheme-removed",
            },
          ],
        },
      ]
    `);
  });
});
