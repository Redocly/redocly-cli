import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/load.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('TagsDuplicateNames', () => {
  it('should report on duplicate tag names (case sensitive)', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - name: pets
              description: Pet operations
            - name: users
              description: User operations
            - name: pets
              description: Another pet tag
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-duplicated-tag-names': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/tags/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Duplicate tag name found: 'pets'.",
          "ruleId": "no-duplicated-tag-names",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on multiple duplicate tag names', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - name: pets
              description: Pet operations
            - name: users
              description: User operations
            - name: pets
              description: Another pet tag
            - name: orders
              description: Order operations
            - name: users
              description: Another user tag
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-duplicated-tag-names': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/tags/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Duplicate tag name found: 'pets'.",
          "ruleId": "no-duplicated-tag-names",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/tags/4",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Duplicate tag name found: 'users'.",
          "ruleId": "no-duplicated-tag-names",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when ignoreCase is false and tag names differ by case', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - name: pets
              description: Pet operations
            - name: Pets
              description: Pet operations (capitalized)
            - name: PETS
              description: Pet operations (uppercase)
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'no-duplicated-tag-names': {
            severity: 'error',
            ignoreCase: false,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report when ignoreCase is true and tag names differ only by case', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - name: pets
              description: Pet operations
            - name: Pets
              description: Pet operations (capitalized)
            - name: PETS
              description: Pet operations (uppercase)
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        rules: {
          'no-duplicated-tag-names': {
            severity: 'error',
            ignoreCase: true,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/tags/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Duplicate tag name found: 'Pets'.",
          "ruleId": "no-duplicated-tag-names",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/tags/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Duplicate tag name found: 'PETS'.",
          "ruleId": "no-duplicated-tag-names",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when all tag names are unique', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - name: pets
              description: Pet operations
            - name: users
              description: User operations
            - name: orders
              description: Order operations
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-duplicated-tag-names': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when no tags are present', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            title: Test API
            version: 1.0.0
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-duplicated-tag-names': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report when tags array is empty', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags: []
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-duplicated-tag-names': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should work with single tag', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - name: pets
              description: Pet operations
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-duplicated-tag-names': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should work with OpenAPI 2.0 (Swagger)', async () => {
    const document = parseYamlToDocument(
      outdent`
          swagger: '2.0'
          info:
            title: Test API
            version: 1.0.0
          tags:
            - name: pets
              description: Pet operations
            - name: users
              description: User operations
            - name: pets
              description: Another pet tag
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-duplicated-tag-names': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/tags/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Duplicate tag name found: 'pets'.",
          "ruleId": "no-duplicated-tag-names",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report consecutive duplicates correctly', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - name: pets
              description: Pet operations
            - name: pets
              description: Another pet tag
            - name: pets
              description: Third pet tag
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-duplicated-tag-names': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/tags/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Duplicate tag name found: 'pets'.",
          "ruleId": "no-duplicated-tag-names",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/tags/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Duplicate tag name found: 'pets'.",
          "ruleId": "no-duplicated-tag-names",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
