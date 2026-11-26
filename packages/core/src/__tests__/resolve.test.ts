import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { parseYamlToDocument } from '../../__tests__/utils.js';
import { resolveConfig } from '../config/config-resolvers.js';
import { Location } from '../ref-utils.js';
import { resolveDocument, lookupResolvedRef, BaseResolver, type Document } from '../resolve.js';
import { AsyncApi3Types } from '../types/asyncapi3.js';
import { normalizeTypes } from '../types/index.js';
import { Oas3Types } from '../types/oas3.js';
import { Oas3_1Types } from '../types/oas3_1.js';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return { ...actual };
});

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

    await expect(
      resolveDocument({
        rootDocument,
        externalRefResolver: new BaseResolver(),
        rootType: normalizeTypes(Oas3Types).Root,
      })
    ).rejects.toThrow('Self-referencing circular pointer');
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

    await expect(
      resolveDocument({
        rootDocument,
        externalRefResolver: new BaseResolver(),
        rootType: normalizeTypes(Oas3Types).Root,
      })
    ).rejects.toThrow('Self-referencing circular pointer');
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

  it('should record a $ref with sibling keys as a chain hop while following transitive refs', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          $ref: "#/aliased"
        aliased:
          $ref: '#/target'
          description: alias with sibling
        target:
          contact: {}
      `,
      'foobar.yaml'
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).Root,
    });

    const aliasedRef = resolvedRefs.get('foobar.yaml::#/aliased')!;
    expect(aliasedRef.node).toEqual({ contact: {} });
    expect(aliasedRef.chain).toHaveLength(1);
    expect(aliasedRef.chain![0].node).toEqual({
      $ref: '#/target',
      description: 'alias with sibling',
    });
    expect(aliasedRef.chain![0].location.pointer).toEqual('#/aliased');
    expect(resolvedRefs.get('foobar.yaml::#/target')!.node).toEqual({ contact: {} });
  });

  it('should resolve a pointer that traverses through a composed ref into an array item', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          $ref: '#/listAlias/0'
        listAlias:
          $ref: '#/list'
          description: alias with sibling
        list:
          - contact: {}
      `,
      'foobar.yaml'
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).Root,
    });

    const infoRef = resolvedRefs.get('foobar.yaml::#/listAlias/0')!;
    expect(infoRef.node).toEqual({ contact: {} });
    // a ref passed through mid-pointer is not a composition chain of the outer ref
    expect(infoRef.chain).toBeUndefined();
  });

  it('should record each level of a multi-hop composed chain independently', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          $ref: "#/first"
        first:
          $ref: '#/second'
          description: first hop
        second:
          $ref: '#/target'
          description: second hop
        target:
          contact: {}
      `,
      'foobar.yaml'
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).Root,
    });

    const outerRef = resolvedRefs.get('foobar.yaml::#/first')!;
    expect(outerRef.node).toEqual({ contact: {} });
    expect(outerRef.chain!.map((hop) => hop.location.pointer)).toEqual(['#/first', '#/second']);

    // the inner resolution must not be polluted by outer hops
    const innerRef = resolvedRefs.get('foobar.yaml::#/second')!;
    expect(innerRef.node).toEqual({ contact: {} });
    expect(innerRef.chain!.map((hop) => hop.location.pointer)).toEqual(['#/second']);
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
      expect(resolvedRef).toEqual(
        expect.objectContaining({
          resolved: true,
          node: {
            type: 'string',
            description: 'A test schema',
          },
        })
      );
    });
  });
});

describe('remote refs with query strings', () => {
  it('should resolve a pointer into a remote file with a query string', async () => {
    const plainTextFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            outdent`
              openapi: 3.1.0
              paths:
                /api/invoices:
                  get:
                    operationId: listInvoices
            `
          ),
        headers: { get: () => 'text/plain; charset=utf-8' },
      })
    );
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /test:
            $ref: 'https://localhost/test.yaml?ref=blah#/paths/~1api~1invoices'
      `,
      'foobar.yaml'
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver({
        http: { customFetch: plainTextFetch as any, headers: [] },
      }),
      rootType: normalizeTypes(Oas3Types).Root,
    });

    const resolvedRef = Array.from(resolvedRefs.values())[0];
    expect(resolvedRef.resolved).toBe(true);
    expect(resolvedRef.node).toEqual({ get: { operationId: 'listInvoices' } });
  });
});

describe('schema $id resolution', () => {
  it('should resolve $defs and relative refs against the enclosing schema $id without loading files', async () => {
    const rootDocument = parseYamlToDocument(
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
                challenges:
                  type: array
                  items:
                    $ref: '#/$defs/Challenge'
              $defs:
                Challenge:
                  type: object
                  properties:
                    file:
                      $ref: '#/$defs/File'
                File:
                  type: string
            Tag:
              $id: 'https://example.com/schemas/tag'
              type: object
      `,
      path.join(__dirname, 'fixtures/resolve/openapi.yaml')
    );
    const resolver = new BaseResolver();
    const loadSpy = vi.spyOn(resolver, 'loadExternalRef');

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: resolver,
      rootType: normalizeTypes(Oas3_1Types).Root,
    });

    expect(loadSpy).not.toHaveBeenCalled();
    const pointerOf = (ref: string) => {
      const resolved = resolvedRefs.get(`https://example.com/schemas/pet::${ref}`);
      return resolved?.resolved && !resolved.isRemote ? resolved.nodePointer : undefined;
    };
    expect(pointerOf('tag')).toBe('#/components/schemas/Tag');
    expect(pointerOf('#/$defs/Challenge')).toBe('#/components/schemas/Pet/$defs/Challenge');
    expect(pointerOf('#/$defs/File')).toBe('#/components/schemas/Pet/$defs/File');
  });

  it('should resolve nested relative $id against parent schema $id', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              $id: 'https://example.com/schemas/pet.json'
              type: object
              properties:
                collar:
                  $id: 'parts/collar.json'
                  type: object
                  properties:
                    tag:
                      $ref: '../tag.json'
                    buckle:
                      $ref: '#/$defs/Buckle'
                  $defs:
                    Buckle:
                      type: string
            Tag:
              $id: 'https://example.com/schemas/tag.json'
              type: object
              properties:
                code:
                  type: string
      `,
      'foobar.yaml'
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3_1Types).Root,
    });

    const tagRef = resolvedRefs.get('https://example.com/schemas/parts/collar.json::../tag.json');
    const buckleRef = resolvedRefs.get(
      'https://example.com/schemas/parts/collar.json::#/$defs/Buckle'
    );

    expect(tagRef?.resolved).toBe(true);
    expect(tagRef?.nodePointer).toBe('#/components/schemas/Tag');
    expect(buckleRef?.resolved).toBe(true);
    expect(buckleRef?.nodePointer).toBe('#/components/schemas/Pet/properties/collar/$defs/Buckle');
    expect(buckleRef?.node).toEqual({ type: 'string' });
  });

  it('should resolve URN $id references and ignore $id inside example values of properties named properties', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Feature:
              $id: 'https://example.com/schemas/feature.json'
              type: object
              properties:
                properties:
                  type: object
                  example:
                    $id: 'urn:uuid:ee564b8a-7a87-4125-8c96-e9f123d6766f'
                    hijacked: true
                tag:
                  $ref: 'urn:uuid:ee564b8a-7a87-4125-8c96-e9f123d6766f'
            Tag:
              $id: 'urn:uuid:ee564b8a-7a87-4125-8c96-e9f123d6766f'
              type: object
              properties:
                label:
                  type: string
      `,
      'foobar.yaml'
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3_1Types).Root,
    });

    const tagRef = resolvedRefs.get(
      'https://example.com/schemas/feature.json::urn:uuid:ee564b8a-7a87-4125-8c96-e9f123d6766f'
    );
    expect(tagRef?.resolved).toBe(true);
    expect(tagRef?.nodePointer).toBe('#/components/schemas/Tag');
  });

  it('should fall back to resolving relative file refs against the document path when not a known $id resource', async () => {
    const dir = path.join(__dirname, 'fixtures/resolve-file-fallback');
    const tagPath = path.join(dir, 'tag.yaml');
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              $id: 'https://example.com/schemas/pet'
              type: object
              properties:
                tag:
                  $ref: './tag.yaml'
      `,
      path.join(dir, 'openapi.yaml')
    );
    const tagDocument = parseYamlToDocument(
      outdent`
        type: object
        properties:
          label:
            type: string
      `,
      tagPath
    );

    const resolver = new BaseResolver();
    resolver.cache.set(tagPath, Promise.resolve(tagDocument));
    const loadSpy = vi.spyOn(resolver, 'loadExternalRef');

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: resolver,
      rootType: normalizeTypes(Oas3_1Types).Root,
    });

    expect(loadSpy).not.toHaveBeenCalled();
    const tagRef = resolvedRefs.get('https://example.com/schemas/pet::./tag.yaml');
    expect(tagRef?.resolved).toBe(true);
    expect(tagRef?.document).toBe(tagDocument);
    expect(tagRef?.node).toEqual({
      type: 'object',
      properties: { label: { type: 'string' } },
    });
  });

  it('should not allow a remote document with a file: $id to read local files', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              $id: 'file:///etc/x'
              type: object
              properties:
                relativeSecret:
                  $ref: 'hostname'
                fileUrlSecret:
                  $ref: 'file:///etc/hostname'
      `,
      'https://remote.example/openapi.yaml'
    );

    const resolver = new BaseResolver();
    const loadSpy = vi
      .spyOn(resolver, 'loadExternalRef')
      .mockRejectedValue(new Error('Remote fetch blocked in test'));

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: resolver,
      rootType: normalizeTypes(Oas3_1Types).Root,
    });

    const relativeRef = resolvedRefs.get('file:///etc/x::hostname');
    expect(relativeRef?.resolved).toBe(false);
    expect(loadSpy).toHaveBeenCalledWith('https://remote.example/hostname');

    const fileUrlRef = resolvedRefs.get('file:///etc/x::file:///etc/hostname');
    expect(fileUrlRef?.resolved).toBe(false);
    expect(fileUrlRef?.error?.message).toContain(
      "A remote document can't reference file:///etc/hostname, which is a local file."
    );
  });

  it('should resolve $id references and definitions in AsyncAPI 3 schemas', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        asyncapi: 3.0.0
        info:
          title: Pet Events
          version: 1.0.0
        components:
          schemas:
            PetPayload:
              $id: 'https://example.com/async/pet'
              type: object
              properties:
                collar:
                  $ref: '#/definitions/Collar'
                tag:
                  $ref: 'tag'
              definitions:
                Collar:
                  type: string
            TagPayload:
              $id: 'https://example.com/async/tag'
              type: object
              properties:
                id:
                  type: string
      `,
      'asyncapi.yaml'
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(AsyncApi3Types).Root,
    });

    const collarRef = resolvedRefs.get('https://example.com/async/pet::#/definitions/Collar');
    const tagRef = resolvedRefs.get('https://example.com/async/pet::tag');

    expect(collarRef?.resolved).toBe(true);
    expect(collarRef?.nodePointer).toBe('#/components/schemas/PetPayload/definitions/Collar');
    expect(collarRef?.node).toEqual({ type: 'string' });
    expect(tagRef?.resolved).toBe(true);
    expect(tagRef?.nodePointer).toBe('#/components/schemas/TagPayload');
  });
});

describe('schema $id resolution: parity and isolation', () => {
  it('should pass refs with custom URI schemes to the resolver when there is no $id', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              $ref: 's3://bucket/pet.yaml'
      `,
      '/tmp/redocly-id-test/openapi.yaml'
    );
    const resolver = new BaseResolver();
    const resolveSpy = vi
      .spyOn(resolver, 'resolveDocument')
      .mockResolvedValue(parseYamlToDocument('type: string', 's3://bucket/pet.yaml') as Document);

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: resolver,
      rootType: normalizeTypes(Oas3_1Types).Root,
    });

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    const petRef = resolvedRefs.get('/tmp/redocly-id-test/openapi.yaml::s3://bucket/pet.yaml');
    expect(petRef?.resolved).toBe(true);
    expect(petRef?.node).toEqual({ type: 'string' });
  });

  it('should keep the error when a pointer passes through a $ref that cannot be resolved', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Wrapper:
              $ref: './does-not-exist.yaml'
            Use:
              $ref: '#/components/schemas/Wrapper/properties/foo'
      `,
      path.join(__dirname, 'fixtures/resolve/broken-intermediate.yaml')
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3_1Types).Root,
    });

    const useRef = resolvedRefs.get(
      path.join(__dirname, 'fixtures/resolve/broken-intermediate.yaml') +
        '::#/components/schemas/Wrapper/properties/foo'
    );
    expect(useRef?.resolved).toBe(false);
    expect(useRef?.error?.message).toContain('ENOENT');
  });

  it.each([
    {
      name: 'resolves a $ref written next to $id in the same schema',
      schemas: outdent`
        Entry:
          $id: 'https://example.com/schemas/entry'
          $ref: '#/components/schemas/Target'
        Target:
          type: string
      `,
      key: 'https://example.com/schemas/entry::#/components/schemas/Target',
      pointer: '#/components/schemas/Target',
    },
    {
      name: 'resolves against a relative $id that names a directory',
      schemas: outdent`
        Pet:
          $id: 'schemas/'
          properties:
            tag:
              $ref: 'tag.json'
        Tag:
          $id: 'schemas/tag.json'
          type: string
      `,
      key: '/tmp/redocly-id-test/schemas/::tag.json',
      pointer: '#/components/schemas/Tag',
    },
    {
      name: 'matches $id and $ref URIs regardless of scheme and host case',
      schemas: outdent`
        Pet:
          $id: 'HTTPS://EXAMPLE.COM/schemas/pet'
          properties:
            tag:
              $ref: 'tag'
        Tag:
          $id: 'https://Example.com/schemas/tag'
          type: string
      `,
      key: 'https://example.com/schemas/pet::tag',
      pointer: '#/components/schemas/Tag',
    },
    {
      name: 'does not resolve a plain-name fragment ref to the root of an $id resource',
      schemas: outdent`
        Pet:
          $id: 'https://example.com/schemas/pet'
          properties:
            label:
              $ref: 'tag#label'
        Tag:
          $id: 'https://example.com/schemas/tag'
          type: object
      `,
      key: 'https://example.com/schemas/pet::tag#label',
      pointer: undefined,
    },
  ])('$name', async ({ schemas, key, pointer }) => {
    const rootDocument = parseYamlToDocument(
      `openapi: 3.1.0\ncomponents:\n  schemas:\n${schemas.replace(/^/gm, '    ')}\n`,
      '/tmp/redocly-id-test/openapi.yaml'
    );
    const resolver = new BaseResolver();
    vi.spyOn(resolver, 'loadExternalRef').mockRejectedValue(new Error('not found'));

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: resolver,
      rootType: normalizeTypes(Oas3_1Types).Root,
    });

    expect(resolvedRefs.get(key)?.resolved).toBe(pointer !== undefined);
    expect(resolvedRefs.get(key)?.nodePointer).toBe(pointer);
  });

  it('should still reject a pointer that loops through a $ref when there is no $id', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Loop:
              $ref: '#/components/schemas/Loop/properties/x'
      `,
      '/tmp/redocly-id-test/openapi.yaml'
    );

    await expect(
      resolveDocument({
        rootDocument,
        externalRefResolver: new BaseResolver(),
        rootType: normalizeTypes(Oas3_1Types).Root,
      })
    ).rejects.toThrow('Self-referencing circular pointer');
  });

  it('should keep $id scopes of an external schema file referenced from the config', async () => {
    const configPath = '/tmp/redocly-id-test/redocly.yaml';
    const schemaPath = '/tmp/redocly-id-test/info-schema.yaml';
    const resolver = new BaseResolver();
    resolver.cache.set(
      schemaPath,
      Promise.resolve(
        parseYamlToDocument(
          outdent`
            $id: 'https://example.com/schemas/info'
            type: object
            properties:
              title:
                $ref: '#/$defs/Title'
            $defs:
              Title:
                type: string
          `,
          schemaPath
        )
      )
    );

    const { resolvedConfig } = await resolveConfig({
      rawConfigDocument: parseYamlToDocument(
        outdent`
          rules:
            rule/info-schema:
              subject:
                type: Info
              assertions:
                schema:
                  $ref: './info-schema.yaml'
        `,
        configPath
      ) as Document,
      configPath,
      externalRefResolver: resolver,
    });

    expect((resolvedConfig.rules as any)['rule/info-schema'].assertions.schema.properties).toEqual({
      title: { type: 'string' },
    });
  });

  it('should keep $id-scoped resolutions separate for runs that share a cached document', async () => {
    const petPath = '/tmp/redocly-id-test/pet.yaml';
    const petDocument = parseYamlToDocument(
      outdent`
        $id: 'https://example.com/schemas/pet.yaml'
        type: object
        properties:
          tag:
            $ref: '#/$defs/Tag'
        $defs:
          Tag:
            type: string
      `,
      petPath
    );
    const resolver = new BaseResolver();
    resolver.cache.set(petPath, Promise.resolve(petDocument));
    const makeRoot = () =>
      parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          components:
            schemas:
              Pet:
                $ref: './pet.yaml'
        `,
        '/tmp/redocly-id-test/openapi.yaml'
      );
    const rootType = normalizeTypes(Oas3_1Types).Root;

    const firstRun = await resolveDocument({
      rootDocument: makeRoot(),
      externalRefResolver: resolver,
      rootType,
    });
    const secondRun = await resolveDocument({
      rootDocument: makeRoot(),
      externalRefResolver: resolver,
      rootType,
    });

    const tagRefNode = (petDocument.parsed as any).properties.tag;
    const petLocation = new Location(petDocument.source, '#/');
    const fromFirst = lookupResolvedRef(firstRun, tagRefNode, undefined, petLocation);
    const fromSecond = lookupResolvedRef(secondRun, tagRefNode, undefined, petLocation);

    expect(fromFirst?.resolved).toBe(true);
    expect(fromFirst).toBe(firstRun.get('https://example.com/schemas/pet.yaml::#/$defs/Tag'));
    expect(fromSecond).toBe(secondRun.get('https://example.com/schemas/pet.yaml::#/$defs/Tag'));
  });
});
