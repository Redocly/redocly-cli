import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('oas3 boolean-parameter-prefixes', () => {
  it('should report on unresolved $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: 'invalid.yaml'
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/requestBody",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref: ENOENT: no such file or directory 'invalid.yaml'",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unresolved-refs",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on unresolved $ref yaml error', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: 'fixtures/invalid-yaml.yaml'
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": undefined,
              "reportOnKey": false,
              "source": "fixtures/invalid-yaml.yaml",
              "start": {
                "col": 8,
                "line": 1,
              },
            },
          ],
          "message": "Failed to parse: unexpected end of the stream within a single quoted scalar in "fixtures/invalid-yaml.yaml" (1:8)",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/requestBody",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref: unexpected end of the stream within a single quoted scalar in "fixtures/invalid-yaml.yaml" (1:8)",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unresolved-refs",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on a resolvable $ref yaml file', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: 'fixtures/ref.yaml'
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on unresolved localr ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: '#/components/requestBodies/a'
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/requestBody",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unresolved-refs",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on refs inside specification extensions', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          requestBodies:
            a:
              content:
                application/json:
                  schema:
                    type: object
        x-webhooks:
          test:
            put:
              requestBody:
                $ref: '#/components/requestBodies/a'
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on nested refs inside specification extensions', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        x-test:
          prop:
            $ref: 'fixtures/ref.yaml'
        paths:
          '/test':
            get:
              x-codeSamples:
                - lang: PHP
                  source:
                    $ref: 'fixtures/code-sample.php'
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on nested refs inside specification extensions for 3.1', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        x-test:
          prop:
            $ref: 'fixtures/ref.yaml'
        paths:
          '/test':
            get:
              x-codeSamples:
                - lang: PHP
                  source:
                    $ref: 'fixtures/code-sample.php'
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on discriminator mapping values that are schema names', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              oneOf:
                - $ref: '#/components/schemas/Cat'
                - $ref: '#/components/schemas/Dog'
              discriminator:
                propertyName: petType
                mapping:
                  cat: Cat
                  dog: Dog
            Cat:
              type: object
            Dog:
              type: object
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });

  it('should report discriminator mapping values that are neither a schema name nor a resolvable ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              oneOf:
                - $ref: '#/components/schemas/Cat'
                - $ref: '#/components/schemas/Dog'
              discriminator:
                propertyName: petType
                mapping:
                  cat: '#/components/schemas/Cat'
                  dog: Doge
                  bird: '#/components/schemas/Bird'
            Cat:
              type: object
            Dog:
              type: object
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet/discriminator/mapping/dog",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Discriminator mapping value 'Doge' does not point to an existing schema component.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unresolved-refs",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet/discriminator/mapping/bird",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unresolved-refs",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should resolve $defs and sibling $id refs in OAS 3.1 and report missing $defs refs', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              $id: 'https://example.com/schemas/pet'
              type: object
              properties:
                tag:
                  $ref: 'tag'
                collar:
                  $ref: '#/$defs/Collar'
                missing:
                  $ref: '#/$defs/Missing'
              $defs:
                Collar:
                  type: string
            Tag:
              $id: 'https://example.com/schemas/tag'
              type: object
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet/properties/missing",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unresolved-refs",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should isolate $defs scopes across multiple $id schemas in one document and report duplicate $id', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            First:
              $id: 'https://example.com/schemas/first'
              type: object
              properties:
                x:
                  $ref: '#/$defs/X'
              $defs:
                X:
                  type: string
            Second:
              $id: 'https://example.com/schemas/second'
              type: object
              properties:
                x:
                  $ref: '#/$defs/X'
            Dup:
              $id: 'https://example.com/schemas/first'
              type: object
      `,
      path.join(__dirname, 'foobar.yaml')
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

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Dup/$id",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Duplicate schema $id 'https://example.com/schemas/first'.",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unresolved-refs",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/schemas/Second/properties/x",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref",
          "reference": "https://redocly.com/docs/cli/rules/oas/no-unresolved-refs",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
  it('should resolve refs of a schema that has both $id and $ref without looping', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Entry:
              $id: 'https://example.com/schemas/entry'
              $ref: '#/$defs/Base'
              $defs:
                Base:
                  $ref: '#/components/schemas/Other'
            Self:
              $id: 'https://example.com/schemas/self'
              $ref: 'https://example.com/schemas/self#/nonexistent'
            Other:
              type: string
      `,
      path.join(__dirname, 'foobar.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-unresolved-refs': 'error' } }),
    });

    expect(results.map(({ message, location }) => `${location[0].pointer}: ${message}`))
      .toMatchInlineSnapshot(`
      [
        "#/components/schemas/Self: Can't resolve $ref",
      ]
    `);
  });

  it('should not treat $id inside extensions or example values reached by a pointer as schema $id', async () => {
    const examplesPath = path.join(__dirname, 'examples.yaml');
    const resolver = new BaseResolver();
    resolver.cache.set(
      examplesPath,
      Promise.resolve(
        parseYamlToDocument(
          outdent`
            components:
              examples:
                Payload:
                  value:
                    $id: 'https://example.com/schemas/pet'
                    Sub:
                      type: string
          `,
          examplesPath
        )
      )
    );
    const metaPath = path.join(__dirname, 'meta.yaml');
    resolver.cache.set(
      metaPath,
      Promise.resolve(
        parseYamlToDocument(
          outdent`
            $id: 'https://example.com/schemas/pet'
            Sub:
              type: string
          `,
          metaPath
        )
      )
    );
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              $id: 'https://example.com/schemas/pet'
              type: object
            Container:
              type: object
              x-meta:
                $id: 'https://example.com/schemas/pet'
                Sub:
                  type: string
            FromExtension:
              $ref: '#/components/schemas/Container/x-meta/Sub'
            FromExample:
              $ref: './examples.yaml#/components/examples/Payload/value/Sub'
            ThroughRef:
              type: object
              x-meta:
                $ref: './meta.yaml'
            FromExtensionRef:
              $ref: '#/components/schemas/ThroughRef/x-meta/Sub'
      `,
      path.join(__dirname, 'openapi.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: resolver,
      document,
      config: await createConfig({ rules: { 'no-unresolved-refs': 'error' } }),
    });

    expect(results).toMatchInlineSnapshot(`[]`);
  });

  it('should step through the $ref of an external $id file root like a file without $id', async () => {
    const petPath = path.join(__dirname, 'pet.yaml');
    const basePath = path.join(__dirname, 'base.yaml');
    const resolver = new BaseResolver();
    resolver.cache.set(
      petPath,
      Promise.resolve(
        parseYamlToDocument(
          outdent`
            $id: 'https://example.com/schemas/pet'
            $ref: './base.yaml'
            properties:
              tag:
                $ref: '#/$defs/Tag'
          `,
          petPath
        )
      )
    );
    resolver.cache.set(
      basePath,
      Promise.resolve(parseYamlToDocument('$defs:\n  Tag:\n    type: string\n', basePath))
    );
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              $ref: './pet.yaml'
      `,
      path.join(__dirname, 'openapi.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: resolver,
      document,
      config: await createConfig({ rules: { 'no-unresolved-refs': 'error' } }),
    });

    expect(results).toMatchInlineSnapshot(`[]`);
  });

  it('should resolve a pointer into an external $id schema file that is used before the whole file', async () => {
    const petPath = path.join(__dirname, 'pet.yaml');
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Collar:
              $ref: './pet.yaml#/$defs/Collar'
            Pet:
              $ref: './pet.yaml'
      `,
      path.join(__dirname, 'openapi.yaml')
    );
    const resolver = new BaseResolver();
    resolver.cache.set(
      petPath,
      Promise.resolve(
        parseYamlToDocument(
          outdent`
            $id: 'https://example.com/schemas/pet.yaml'
            type: object
            properties:
              collar:
                $ref: '#/$defs/Collar'
            $defs:
              Collar:
                type: object
                properties:
                  tag:
                    $ref: '#/$defs/Tag'
              Tag:
                type: string
          `,
          petPath
        )
      )
    );

    const results = await lintDocument({
      externalRefResolver: resolver,
      document,
      config: await createConfig({ rules: { 'no-unresolved-refs': 'error' } }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });
});
