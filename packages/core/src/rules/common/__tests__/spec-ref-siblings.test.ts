import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

async function lint(source: string) {
  const document = parseYamlToDocument(source, 'foo.yaml');
  const results = await lintDocument({
    externalRefResolver: new BaseResolver(),
    document,
    config: await createConfig({ rules: { 'spec-ref-siblings': 'error' } }),
  });
  return replaceSourceWithRef(results);
}

describe('spec-ref-siblings', () => {
  it('reports a sibling next to a Reference Object $ref in OAS 3.0', async () => {
    const results = await lint(outdent`
      openapi: 3.0.0
      info: { title: t, version: 1.0.0 }
      paths:
        /x:
          get:
            responses:
              '200':
                $ref: '#/components/responses/Ok'
                description: ignored here
      components:
        responses:
          Ok:
            description: ok
    `);

    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1x/get/responses/200/description",
              "reportOnKey": true,
              "source": "foo.yaml",
            },
          ],
          "message": "Property \`description\` is not expected here because it is defined alongside \`$ref\`.",
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-ref-siblings",
          "ruleId": "spec-ref-siblings",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('reports a sibling next to a Schema Object $ref in OAS 3.0', async () => {
    const results = await lint(outdent`
      openapi: 3.0.0
      info: { title: t, version: 1.0.0 }
      paths:
        /x:
          get:
            responses:
              '200':
                description: ok
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/Base'
                      readOnly: true
      components:
        schemas:
          Base: { type: object }
    `);

    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1x/get/responses/200/content/application~1json/schema/readOnly",
              "reportOnKey": true,
              "source": "foo.yaml",
            },
          ],
          "message": "Property \`readOnly\` is not expected here because it is defined alongside \`$ref\`.",
          "reference": "https://redocly.com/docs/cli/rules/oas/spec-ref-siblings",
          "ruleId": "spec-ref-siblings",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('does not report `summary`/`description` next to a Reference Object $ref in OAS 3.1', async () => {
    const results = await lint(outdent`
      openapi: 3.1.0
      info: { title: t, version: 1.0.0 }
      paths:
        /x:
          get:
            responses:
              '200':
                $ref: '#/components/responses/Ok'
                summary: a summary
                description: a description
      components:
        responses:
          Ok:
            description: ok
    `);

    expect(results).toHaveLength(0);
  });

  it('does not report siblings next to a Schema Object $ref in OAS 3.1', async () => {
    const results = await lint(outdent`
      openapi: 3.1.0
      info: { title: t, version: 1.0.0 }
      paths:
        /x:
          get:
            responses:
              '200':
                description: ok
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/Base'
                      readOnly: true
                      description: a description
      components:
        schemas:
          Base: { type: object }
    `);

    expect(results).toHaveLength(0);
  });

  it('ignores `x-` extensions next to a $ref', async () => {
    const results = await lint(outdent`
      openapi: 3.0.3
      info: { title: t, version: 1.0.0 }
      paths:
        /x:
          get:
            responses:
              '200':
                $ref: '#/components/responses/Ok'
                x-internal: true
      components:
        responses:
          Ok:
            description: ok
    `);

    expect(results).toHaveLength(0);
  });

  it('reports a $ref sibling in AsyncAPI 2.x', async () => {
    const results = await lint(outdent`
      asyncapi: '2.6.0'
      info: { title: t, version: 1.0.0 }
      channels:
        test:
          publish:
            message:
              $ref: '#/components/messages/Msg'
              summary: ignored here
      components:
        messages:
          Msg:
            payload: { type: object }
    `);

    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('`summary`');
  });

  it('reports a Schema $ref sibling in OpenRPC', async () => {
    const results = await lint(outdent`
      openrpc: 1.2.6
      info: { title: t, version: 1.0.0 }
      methods:
        - name: listPets
          params: []
          result:
            name: pets
            schema:
              $ref: '#/components/schemas/Pet'
              readOnly: true
      components:
        schemas:
          Pet: { type: object }
    `);

    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('`readOnly`');
  });
});
