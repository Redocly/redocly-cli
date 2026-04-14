import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 spec-strict-refs', () => {
  it('should report about invalid usage of $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: "3.1.0"
      info:
        $ref: '#/components/schemas/test'
      paths:
        /store/subscribe:
          post:
            responses:
              '201':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        $ref: '#/components/schemas/test'
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456
      components:
        schemas:
          test:
            type: object                    
		`
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-strict-refs': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/info/$ref",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Field $ref is not expected here.",
          "ruleId": "spec-strict-refs",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1store~1subscribe/post/responses/201/content/application~1json/schema/properties/$ref",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Field $ref is not expected here.",
          "ruleId": "spec-strict-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
