import { outdent } from 'outdent';

import { replaceSourceWithRefInChanges } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { makeDocumentFromString } from '../../../resolve.js';
import { diffDocuments } from '../../index.js';

const cafe = (apiKey: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths: {}
  components:
    securitySchemes:
      ApiKey: ${apiKey}
`;

describe('security-scheme-changed', () => {
  it('should report a field clients authenticate with', async () => {
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: apiKey, in: header, name: X-Api-Key }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(
        cafe('{ type: apiKey, in: header, name: X-Cafe-Key }'),
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
    const result = diffDocuments({
      base: makeDocumentFromString(
        cafe('{ type: apiKey, in: header, name: X-Api-Key }'),
        'base.yaml'
      ),
      revision: makeDocumentFromString(cafe('{ type: http, scheme: bearer }'), 'revision.yaml'),
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
});
