import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { BaseResolver } from '../../../resolve.js';

describe('no-http-verbs-in-paths', () => {
  it('should report on HTTP verbs in paths', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths:
          /path/post:
            get:
              summary: Contains http verb post in the end
          /get/path:
            get: 
              summary: Contains http verb get in the beginning
          /path/query:
            get:
              summary: Should not report on query since it's not an http verb in OAS 3.1
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-http-verbs-in-paths': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1path~1post",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "path \`/path/post\` should not contain http verb post",
          "ruleId": "no-http-verbs-in-paths",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1get~1path",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "path \`/get/path\` should not contain http verb get",
          "ruleId": "no-http-verbs-in-paths",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
