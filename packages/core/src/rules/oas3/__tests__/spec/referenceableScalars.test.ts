import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../../__tests__/utils';
import { lintDocument } from '../../../../lint';
import { LintConfig } from '../../../..';
import { BaseResolver } from '../../../../resolve';
import { resolveLint } from '../../../../config';

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
      __dirname + '/foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig(
        await resolveLint({
          lintConfig: {
            extends: [],
            rules: {
              spec: 'error',
              'no-unresolved-refs': 'error',
            },
          },
        }),
      ),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
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
      __dirname + '/foobar.yaml',
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: new LintConfig(
        await resolveLint({
          lintConfig: {
            extends: [],
            rules: {
              'no-unresolved-refs': 'error',
            },
            doNotResolveExamples: true,
          },
        }),
      ),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`Array []`);
  });
});
