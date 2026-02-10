import path from 'node:path';
import { lint } from '../../lint.js';
import { replaceSourceWithRef } from '../../../__tests__/utils.js';
import { fileURLToPath } from 'node:url';
import { createConfig } from '../../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('spec ruleset', () => {
  it('should apply the spec ruleset to oas3', async () => {
    const results = await lint({
      ref: './resources/petstore-with-errors.yaml',
      config: await createConfig({
        extends: ['spec'],
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets?id",
              "reportOnKey": true,
              "source": "../../../../../resources/petstore-with-errors.yaml",
            },
          ],
          "message": "Don't put query string items in the path, they belong in parameters with \`in: query\`.",
          "ruleId": "path-not-include-query",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/paths/~1pets?id/get/parameters/0/in",
              "reportOnKey": false,
              "source": "../../../../../resources/petstore-with-errors.yaml",
            },
          ],
          "message": "\`in\` can be one of the following only: "query", "header", "path", "cookie".",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [
            "query",
          ],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1pets?id/get/parameters/1/name",
              "reportOnKey": false,
              "source": "../../../../../resources/petstore-with-errors.yaml",
            },
          ],
          "message": "Path parameter \`test\` is not used in the path \`/pets?id\`.",
          "ruleId": "path-parameters-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/components/parameters/anotherParam",
              "reportOnKey": true,
              "source": "../../../../../resources/petstore-with-errors.yaml",
            },
          ],
          "message": "The field \`name\` must be present on this level.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/components/parameters/anotherParam/nname",
              "reportOnKey": true,
              "source": "../../../../../resources/petstore-with-errors.yaml",
            },
          ],
          "message": "Property \`nname\` is not expected here.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [
            "name",
          ],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/components/parameters/anotherParam/schema/type",
              "reportOnKey": false,
              "source": "../../../../../resources/petstore-with-errors.yaml",
            },
          ],
          "message": "\`type\` can be one of the following only: "object", "array", "string", "number", "integer", "boolean".",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [
            "integer",
          ],
        },
      ]
    `);
  });

  it('should apply the spec ruleset to async2', async () => {
    const results = await lint({
      ref: './resources/async.yaml',
      config: await createConfig({
        extends: ['spec'],
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/components/schemas/streamHeaders/Etag",
              "reportOnKey": true,
              "source": "../../../../../resources/async.yaml",
            },
          ],
          "message": "Property \`Etag\` is not expected here.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/components/schemas/streamHeaders/Cache-Control",
              "reportOnKey": true,
              "source": "../../../../../resources/async.yaml",
            },
          ],
          "message": "Property \`Cache-Control\` is not expected here.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should apply the spec ruleset to arazzo1', async () => {
    const results = await lint({
      ref: './resources/museum-api.arazzo.yaml',
      config: await createConfig({
        extends: ['spec'],
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });
});
