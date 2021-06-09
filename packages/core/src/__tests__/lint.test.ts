import { outdent } from 'outdent';

import { lintFromString } from '../lint';
import { loadConfig } from '../config/load';
import { replaceSourceWithRef } from '../../__tests__/utils';

describe('lint', () => {
  it('lintFromString should work', async () => {
    const results = await lintFromString({
      absoluteRef: process.cwd(),
      source: outdent`
      openapi: 3.0.0
      info:
        title: Test API
        version: "1.0"
        description: Test
        license: Fail

      servers:
        - url: http://example.com
      paths: {}
    `,
      config: await loadConfig(),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/info/license",
              "reportOnKey": false,
              "source": "/Users/romanhotsiy/Projects/Redocly/openapi-cli",
            },
          ],
          "message": "Expected type \`License\` (object) but got \`string\`",
          "ruleId": "spec",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
