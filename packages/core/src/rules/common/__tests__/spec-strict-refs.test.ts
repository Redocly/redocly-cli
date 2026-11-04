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
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-strict-refs",
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
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-strict-refs",
          "ruleId": "spec-strict-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should allow a $ref to a Media Type Object in a content entry (OAS 3.2)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /drinks:
            get:
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      $ref: '#/components/mediaTypes/Drinks'
        components:
          mediaTypes:
            Drinks:
              schema:
                type: object
      `
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-strict-refs': 'error' } }),
    });
    expect(results).toEqual([]);
  });

  it('should report a $ref in a content entry before OAS 3.2', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths:
          /drinks:
            get:
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      $ref: '#/components/x-mediaTypes/Drinks'
        components:
          x-mediaTypes:
            Drinks:
              schema:
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
              "pointer": "#/paths/~1drinks/get/responses/200/content/application~1json/$ref",
              "reportOnKey": true,
              "source": "",
            },
          ],
          "message": "Field $ref is not expected here.",
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-strict-refs",
          "ruleId": "spec-strict-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
