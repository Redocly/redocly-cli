import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../../__tests__/utils.js';
import { lintDocument } from '../../../../lint.js';
import { StyleguideConfig } from '../../../../index.js';
import { BaseResolver } from '../../../../resolve.js';
import { resolveStyleguideConfig } from '../../../../config/index.js';

describe('Referenceable scalars', () => {
  it('should not report $ref description', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
            description:
              $ref: fixtures/description.md
          paths: {}
        `,
      __dirname + '/foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new StyleguideConfig(
        await resolveStyleguideConfig({
          styleguideConfig: {
            extends: [],
            rules: {
              spec: 'error',
              'no-unresolved-refs': 'error',
            },
          },
        })
      ),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report invalid $ref on example with doNotResolveExamples', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            title: Test
            version: '1.0'
            description: Test
          paths:
            '/test':
              get:
                parameters:
                  - name: test
                    example:
                      $ref: not $ref, example
        `,
      __dirname + '/foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new StyleguideConfig(
        await resolveStyleguideConfig({
          styleguideConfig: {
            extends: [],
            rules: {
              'no-unresolved-refs': 'error',
            },
            doNotResolveExamples: true,
          },
        })
      ),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
