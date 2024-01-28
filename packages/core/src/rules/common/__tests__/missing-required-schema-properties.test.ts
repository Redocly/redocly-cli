import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('missing-required-schema-properties', () => {
  it('should report if one or more of the required properties are missing', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Pet:
                type: object
                required:
                  - name
                  - id
                  - test
                properties:
                  id:
                    type: integer
                    format: int64
                  name:
                    type: string
                    example: doggie
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'missing-required-schema-properties': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Property test is required.",
          "ruleId": "missing-required-schema-properties",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report if all more of the required properties are present', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Pet:
                type: object
                required:
                  - name
                  - id
                properties:
                  id:
                    type: integer
                    format: int64
                  name:
                    type: string
                    example: doggie
                  test:
                    type: string
                    example: test
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ 'missing-required-schema-properties': 'error' }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
