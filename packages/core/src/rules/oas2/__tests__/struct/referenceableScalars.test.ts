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
        swagger: '2.0'
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
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});
