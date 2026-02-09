import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../../__tests__/utils.js';
import { createConfig } from '../../../../config/index.js';
import { lintDocument } from '../../../../lint.js';
import { BaseResolver } from '../../../../resolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      config: await createConfig({
        rules: {
          struct: 'error',
          'no-unresolved-refs': 'error',
        },
      }),
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
      config: await createConfig({
        rules: {
          'no-unresolved-refs': 'error',
        },
        resolve: {
          doNotResolveExamples: true,
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report example value with $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.2.0
          info:
            title: Test
            version: '1.0'
          paths:
            '/test':
              get:
                parameters:
                  - name: test
                    schema:
                      type: object
                    examples:
                      test:
                        value:
                          $ref: not $ref, example
        `,
      __dirname + '/foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
