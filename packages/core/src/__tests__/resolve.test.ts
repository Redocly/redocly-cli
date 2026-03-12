import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { parseYamlToDocument } from '../../__tests__/utils.js';
import { resolveDocument, BaseResolver, type Document } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import { Oas3Types } from '../types/oas3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('collect refs', () => {
  it('should resolve local refs', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          $ref: "#/defs/info"
        defs:
          info:
            contact: {}
            license: {}
      `,
      'foobar.yaml'
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).Root,
    });

    expect(resolvedRefs).toBeDefined();
    expect(resolvedRefs.size).toEqual(1);
    expect(Array.from(resolvedRefs.keys())).toMatchInlineSnapshot(
      [`foobar.yaml::#/defs/info`],
      `
      [
        "foobar.yaml::#/defs/info",
      ]
    `
    );
    expect(Array.from(resolvedRefs.values()).map((info) => info.node)).toEqual([
      { contact: {}, license: {} },
    ]);
  });

  // Or using async/await.
  it('should throw on self-circular refs', async () => {
    expect.assertions(1);

    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          $ref: "#/info"
        defs:
          info:
            contact: {}
            license: {}
      `,
      ''
    );

    try {
      await resolveDocument({
        rootDocument,
        externalRefResolver: new BaseResolver(),
        rootType: normalizeTypes(Oas3Types).Root,
      });
    } catch (e) {
      expect(e.message).toEqual('Self-referencing circular pointer');
    }
  });

  it('should resolve local transitive refs', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          $ref: "#/tmp/info"
        tmp:
          $ref: '#/defs'
        prop:
          $ref: '#/propTrans'
        propTrans:
          $ref: '#/propDest'
        propDest:
          type: string
        defs:
          info:
            contact: {}
            license: {}
      `,
      'foobar.yaml'
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).Root,
    });

    expect(resolvedRefs).toBeDefined();
    expect(resolvedRefs.size).toEqual(4);
    expect(Array.from(resolvedRefs.keys())).toEqual([
      'foobar.yaml::#/defs',
      'foobar.yaml::#/propDest',
      'foobar.yaml::#/tmp/info',
      'foobar.yaml::#/propTrans',
    ]);
    expect(Array.from(resolvedRefs.values()).map((info) => info.node)).toEqual([
      { info: { contact: {}, license: {} } },
      { type: 'string' },
      { contact: {}, license: {} },
      { type: 'string' },
    ]);
  });

  it('should throw on ref loop', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          $ref: "#/loop"
        loop:
          $ref: '#/loop2'
        loop2:
          $ref: '#/info'
      `,
      'foobar.yaml'
    );

    try {
      await resolveDocument({
        rootDocument,
        externalRefResolver: new BaseResolver(),
        rootType: normalizeTypes(Oas3Types).Root,
      });
    } catch (e) {
      expect(e.message).toEqual('Self-referencing circular pointer');
    }
  });

  it('should resolve external ref', async () => {
    const cwd = path.join(__dirname, 'fixtures/resolve');
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          $ref: "./externalInfo.yaml#/info"
      `,
      path.join(cwd, 'foobar.yaml')
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).Root,
    });

    expect(resolvedRefs).toBeDefined();
    // expect(resolvedRefs.size).toEqual(2);
    expect(Array.from(resolvedRefs.keys()).map((ref) => ref.substring(cwd.length + 1))).toEqual([
      'foobar.yaml::./externalInfo.yaml#/info',
      'externalInfo.yaml::./externalLicense.yaml',
    ]);

    expect(Array.from(resolvedRefs.values()).map((info) => info.node)).toEqual([
      {
        contact: {},
        license: {
          $ref: './externalLicense.yaml',
        },
      },
      {
        name: 'MIT',
      },
    ]);
  });

  it('should resolve back references', async () => {
    const cwd = path.join(__dirname, 'fixtures/resolve');
    const externalRefResolver = new BaseResolver();
    const rootDocument = await externalRefResolver.resolveDocument(
      null,
      `${cwd}/openapi-with-back.yaml`
    );

    const resolvedRefs = await resolveDocument({
      rootDocument: rootDocument as Document,
      externalRefResolver: externalRefResolver,
      rootType: normalizeTypes(Oas3Types).Root,
    });

    expect(resolvedRefs).toBeDefined();

    expect(
      Array.from(resolvedRefs.keys())
        .map((ref) => ref.substring(cwd.length + 1))
        .sort()
    ).toMatchInlineSnapshot(`
      [
        "openapi-with-back.yaml::./schemas/type-a.yaml#/",
        "openapi-with-back.yaml::./schemas/type-b.yaml#/",
        "schemas/type-a.yaml::../openapi-with-back.yaml#/components/schemas/TypeB",
      ]
    `);

    expect(
      Array.from(resolvedRefs.values())
        .map((val) => val.node)
        .sort((firstEl, secondEl) => {
          const getKey = (el: any): string => el?.allOf?.type || el?.type || '';

          return getKey(firstEl).localeCompare(getKey(secondEl));
        })
    ).toMatchInlineSnapshot(`
      [
        {
          "allOf": [
            {
              "properties": {
                "integration_type": {
                  "$ref": "../openapi-with-back.yaml#/components/schemas/TypeB",
                },
                "name": {
                  "type": "string",
                },
              },
              "required": [
                "name",
                "integration_type",
              ],
              "type": "object",
            },
          ],
        },
        {
          "enum": [
            "webhook",
            "api_key",
            "sftp",
            "netsuite",
          ],
          "type": "string",
        },
        {
          "enum": [
            "webhook",
            "api_key",
            "sftp",
            "netsuite",
          ],
          "type": "string",
        },
      ]
    `);
  });

  it('should resolve external refs with circular', async () => {
    const cwd = path.join(__dirname, 'fixtures/resolve');
    const externalRefResolver = new BaseResolver();
    const rootDocument = await externalRefResolver.resolveDocument(null, `${cwd}/openapi.yaml`);

    const resolvedRefs = await resolveDocument({
      rootDocument: rootDocument as Document,
      externalRefResolver: externalRefResolver,
      rootType: normalizeTypes(Oas3Types).Root,
    });

    expect(resolvedRefs).toBeDefined();
    expect(Array.from(resolvedRefs.keys()).map((ref) => ref.substring(cwd.length + 1)))
      .toMatchInlineSnapshot(`
      [
        "openapi.yaml::#/components/schemas/Local",
        "openapi.yaml::#/components/schemas/Local/properties/string",
        "openapi.yaml::./External.yaml#/properties/string",
        "openapi.yaml::./External.yaml",
        "External.yaml::./External2.yaml",
        "External2.yaml::./External.yaml#/properties",
      ]
    `);

    expect(Array.from(resolvedRefs.values()).map((val) => val.node)).toMatchInlineSnapshot(`
      [
        {
          "properties": {
            "localCircular": {
              "$ref": "#/components/schemas/Local",
            },
            "number": {
              "type": "number",
            },
            "string": {
              "type": "string",
            },
          },
        },
        {
          "type": "string",
        },
        {
          "type": "string",
        },
        {
          "properties": {
            "external": {
              "$ref": "./External2.yaml",
            },
            "number": {
              "type": "number",
            },
            "string": {
              "type": "string",
            },
            "unknown": {
              "type": "string",
            },
          },
          "type": "object",
        },
        {
          "properties": {
            "circularParent": {
              "$ref": "./External.yaml#/properties",
            },
          },
          "type": "object",
        },
        {
          "external": {
            "$ref": "./External2.yaml",
          },
          "number": {
            "type": "number",
          },
          "string": {
            "type": "string",
          },
          "unknown": {
            "type": "string",
          },
        },
      ]
    `);
  });

  it('should resolve referenceable scalars', async () => {
    const cwd = path.join(__dirname, 'fixtures/resolve');
    const externalRefResolver = new BaseResolver();
    const rootDocument = await externalRefResolver.resolveDocument(
      null,
      `${cwd}/openapi-with-md-description.yaml`
    );

    expect(rootDocument).toBeDefined();

    // @ts-expect-error
    Oas3Types.Info.properties.description['referenceable'] = true;
    const resolvedRefs = await resolveDocument({
      rootDocument: rootDocument as Document,
      externalRefResolver: externalRefResolver,
      rootType: normalizeTypes(Oas3Types).Root,
    });

    expect(resolvedRefs).toBeDefined();
    // expect(resolvedRefs.size).toEqual(2);
    expect(Array.from(resolvedRefs.keys()).map((ref) => ref.substring(cwd.length + 1)))
      .toMatchInlineSnapshot(`
      [
        "openapi-with-md-description.yaml::./description.md",
      ]
    `);
    expect(Array.from(resolvedRefs.values()).map((val) => val.node)).toMatchInlineSnapshot(`
      [
        "# Hello World

      Lorem ipsum
      ",
      ]
    `);
  });

  it('should resolve external transitive ref', async () => {
    const cwd = path.join(__dirname, 'fixtures/resolve');
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          $ref: "./transitive/components.yaml#/components/schemas/a"
      `,
      path.join(cwd, 'foobar.yaml')
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).Root,
    });

    expect(resolvedRefs).toBeDefined();
    expect(resolvedRefs.size).toEqual(3);
    expect(Array.from(resolvedRefs.keys()).map((ref) => ref.substring(cwd.length + 1))).toEqual([
      'transitive/components.yaml::./schemas.yaml#/schemas',
      'transitive/schemas.yaml::a.yaml',
      'foobar.yaml::./transitive/components.yaml#/components/schemas/a',
    ]);

    expect(Array.from(resolvedRefs.values()).pop()!.node).toEqual({ type: 'string' });
  });

  it('should throw error if ref is folder', async () => {
    const cwd = path.join(__dirname, 'fixtures/resolve');
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          $ref: "./transitive/components.yaml#/components/schemas/a"
      `,
      path.join(cwd, 'foobar')
    );
    vi.mock('node:fs', async () => {
      const actual = await vi.importActual('node:fs');
      return { ...actual };
    });
    vi.spyOn(fs, 'lstatSync').mockImplementation((_) => ({ isDirectory: () => true }) as any);

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).Root,
    });

    expect(Array.from(resolvedRefs.values()).pop()!.error).toBeInstanceOf(Error);
  });

  describe('data URL support', () => {
    it('should parse base64-encoded data URLs', async () => {
      const resolver = new BaseResolver();
      const data = 'Hello World';
      const base64Data = Buffer.from(data).toString('base64');
      const dataUrl = `data:text/plain;base64,${base64Data}`;

      const source = await resolver.loadExternalRef(dataUrl);

      expect(source.body).toBe(data);
      expect(source.mimeType).toBe('text/plain');
      expect(source.absoluteRef).toBe(dataUrl);
    });

    it('should parse URL-encoded data URLs', async () => {
      const resolver = new BaseResolver();
      const data = '{"test": "value"}';
      const dataUrl = `data:application/json,${encodeURIComponent(data)}`;

      const source = await resolver.loadExternalRef(dataUrl);

      expect(source.body).toBe(data);
      expect(source.mimeType).toBe('application/json');
      expect(source.absoluteRef).toBe(dataUrl);
    });

    it('should parse plain data URLs without mime type', async () => {
      const resolver = new BaseResolver();
      const data = 'simple text';
      const dataUrl = `data:,${encodeURIComponent(data)}`;

      const source = await resolver.loadExternalRef(dataUrl);

      expect(source.body).toBe(data);
      expect(source.absoluteRef).toBe(dataUrl);
    });

    it('should parse YAML content from base64 data URL', async () => {
      const resolver = new BaseResolver();
      const yaml = 'type: string\ndescription: A test schema';
      const base64Data = Buffer.from(yaml).toString('base64');
      const dataUrl = `data:application/yaml;base64,${base64Data}`;

      const source = await resolver.loadExternalRef(dataUrl);

      expect(source.body).toBe(yaml);
      expect(source.mimeType).toBe('application/yaml');
    });

    it('should resolve refs to data URLs', async () => {
      const schemaData = 'type: string\ndescription: A test schema';
      const base64Data = Buffer.from(schemaData).toString('base64');
      const dataUrl = `data:application/yaml;base64,${base64Data}`;

      const rootDocument = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          components:
            schemas:
              TestSchema:
                $ref: "${dataUrl}"
        `,
        'test.yaml'
      );

      const resolvedRefs = await resolveDocument({
        rootDocument,
        externalRefResolver: new BaseResolver(),
        rootType: normalizeTypes(Oas3Types).Root,
      });

      expect(resolvedRefs).toBeDefined();
      expect(resolvedRefs.size).toEqual(1);
      const resolvedRef = Array.from(resolvedRefs.values())[0];
      expect(resolvedRef.resolved).toBe(true);
      if (resolvedRef.resolved) {
        expect(resolvedRef.node).toEqual({
          type: 'string',
          description: 'A test schema',
        });
      }
    });
  });
});
