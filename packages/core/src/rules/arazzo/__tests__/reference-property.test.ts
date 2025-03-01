import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Arazzo reference-property', () => {
  const document = parseYamlToDocument(
    outdent`
      arazzo: '1.0.1'
      info:
        title: Cool API
        version: 1.0.0
        description: A cool API
      sourceDescriptions:
        - name: museum-api
          type: openapi
          url: openapi.yaml
      workflows:
        - workflowId: get-museum-hours
          description: This workflow demonstrates how to get the museum opening hours and buy tickets.
          parameters:
            - in: header
              name: Authorization
              value: Basic Og==
          steps:
            - stepId: get-museum-hours
              description: >-
                Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
              operationId: museum-api.getMuseumHours
              successCriteria:
                - condition: $statusCode == 200
                  reference: invalid-url
    `,
    'arazzo.yaml'
  );

  it('should report an error when the `reference` property is invalid', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'reference-property': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/get-museum-hours/successCriteria/0",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The \`reference\` property must be a valid URI.",
          "ruleId": "reference-property",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report an error when the `reference` property is valid', async () => {
    const validDocument = parseYamlToDocument(
      outdent`
        arazzo: '1.0.1'
        info:
          title: Cool API
          version: 1.0.0
          description: A cool API
        sourceDescriptions:
          - name: museum-api
            type: openapi
            url: openapi.yaml
        workflows:
          - workflowId: get-museum-hours
            description: This workflow demonstrates how to get the museum opening hours and buy tickets.
            parameters:
              - in: header
                name: Authorization
                value: Basic Og==
            steps:
              - stepId: get-museum-hours
                description: >-
                  Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
                operationId: museum-api.getMuseumHours
                successCriteria:
                  - condition: $statusCode == 200
                    reference: https://www.redocly.com
      `,
      'arazzo.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: validDocument,
      config: await makeConfig({
        rules: { 'reference-property': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
