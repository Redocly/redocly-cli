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

describe('security-scheme-changed', () => {
  it('should report a field clients authenticate with', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${apiKey} }`), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ ApiKey: { type: apiKey, in: header, name: X-Cafe-Key } }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'security-scheme-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/securitySchemes/ApiKey/name",
            "value": "X-Api-Key",
          },
          "impact": "major",
          "key": "#/components/securitySchemes/ApiKey",
          "kind": "modified",
          "property": "name",
          "revision": {
            "location": "revision.yaml#/components/securitySchemes/ApiKey/name",
            "value": "X-Cafe-Key",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/components/securitySchemes/ApiKey/name",
              "message": "\`name\` of security scheme \`ApiKey\` changed from 'X-Api-Key' to 'X-Cafe-Key'.",
              "ruleId": "security-scheme-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a scheme of another type once, not for every field it drags along', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${apiKey} }`), 'base.yaml'),
      revision: makeDocumentFromString(
        cafe('{ ApiKey: { type: http, scheme: bearer } }'),
        'revision.yaml'
      ),
      config: await createConfig({ diff: { 'security-scheme-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(result.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/securitySchemes/ApiKey/type",
            "value": "apiKey",
          },
          "impact": "major",
          "key": "#/components/securitySchemes/ApiKey",
          "kind": "modified",
          "property": "type",
          "revision": {
            "location": "revision.yaml#/components/securitySchemes/ApiKey/type",
            "value": "http",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/components/securitySchemes/ApiKey/type",
              "message": "\`type\` of security scheme \`ApiKey\` changed from 'apiKey' to 'http'.",
              "ruleId": "security-scheme-changed",
            },
          ],
        },
        {
          "base": {
            "location": "base.yaml#/components/securitySchemes/ApiKey/in",
            "value": "header",
          },
          "impact": "patch",
          "key": "#/components/securitySchemes/ApiKey",
          "kind": "modified",
          "property": "in",
          "revision": {
            "location": "revision.yaml#/components/securitySchemes/ApiKey",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/components/securitySchemes/ApiKey/name",
            "value": "X-Api-Key",
          },
          "impact": "patch",
          "key": "#/components/securitySchemes/ApiKey",
          "kind": "modified",
          "property": "name",
          "revision": {
            "location": "revision.yaml#/components/securitySchemes/ApiKey",
            "value": undefined,
          },
          "verdicts": [],
        },
        {
          "base": {
            "location": "base.yaml#/components/securitySchemes/ApiKey",
            "value": undefined,
          },
          "impact": "patch",
          "key": "#/components/securitySchemes/ApiKey",
          "kind": "modified",
          "property": "scheme",
          "revision": {
            "location": "revision.yaml#/components/securitySchemes/ApiKey/scheme",
            "value": "bearer",
          },
          "verdicts": [],
        },
      ]
    `);
  });

  it('should report a field that a scheme gains or loses', async () => {
    const withFormat = 'Bearer: { type: http, scheme: bearer, bearerFormat: JWT }';
    const gained = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${bearer} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${withFormat} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'security-scheme-changed': 'major' } }),
    });
    const lost = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${withFormat} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${bearer} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'security-scheme-changed': 'major' } }),
    });

    expect(replaceSourceWithRefInChanges(gained.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/securitySchemes/Bearer",
            "value": undefined,
          },
          "impact": "major",
          "key": "#/components/securitySchemes/Bearer",
          "kind": "modified",
          "property": "bearerFormat",
          "revision": {
            "location": "revision.yaml#/components/securitySchemes/Bearer/bearerFormat",
            "value": "JWT",
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/components/securitySchemes/Bearer/bearerFormat",
              "message": "\`bearerFormat\` of security scheme \`Bearer\` was set to 'JWT'.",
              "ruleId": "security-scheme-changed",
            },
          ],
        },
      ]
    `);
    expect(replaceSourceWithRefInChanges(lost.changes)).toMatchInlineSnapshot(`
      [
        {
          "base": {
            "location": "base.yaml#/components/securitySchemes/Bearer/bearerFormat",
            "value": "JWT",
          },
          "impact": "major",
          "key": "#/components/securitySchemes/Bearer",
          "kind": "modified",
          "property": "bearerFormat",
          "revision": {
            "location": "revision.yaml#/components/securitySchemes/Bearer",
            "value": undefined,
          },
          "verdicts": [
            {
              "impact": "major",
              "location": "revision.yaml#/components/securitySchemes/Bearer",
              "message": "\`bearerFormat\` of security scheme \`Bearer\` was removed.",
              "ruleId": "security-scheme-changed",
            },
          ],
        },
      ]
    `);
  });

  it('should report a security scheme that is gone', async () => {
    const result = await diffDocuments({
      base: makeDocumentFromString(cafe(`{ ${apiKey}, ${bearer} }`), 'base.yaml'),
      revision: makeDocumentFromString(cafe(`{ ${apiKey} }`), 'revision.yaml'),
      config: await createConfig({ diff: { 'security-scheme-changed': 'major' } }),
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
              "ruleId": "security-scheme-changed",
            },
          ],
        },
      ]
    `);
  });
});
