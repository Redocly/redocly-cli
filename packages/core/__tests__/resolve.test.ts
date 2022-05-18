import { outdent } from 'outdent';
import * as path from 'path';

import { resolveDocument, BaseResolver, Document } from '../src/resolve';
import { parseYamlToDocument } from './utils';
import { Oas3Types } from '../src/types/oas3';
import { normalizeTypes } from '../src/types';

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
      'foobar.yaml',
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).DefinitionRoot,
    });

    expect(resolvedRefs).toBeDefined();
    expect(resolvedRefs.size).toEqual(1);
    expect(Array.from(resolvedRefs.keys())).toMatchInlineSnapshot(
      [`foobar.yaml::#/defs/info`],
      `
      Array [
        "foobar.yaml::#/defs/info",
      ]
    `,
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
      '',
    );

    try {
      await resolveDocument({
        rootDocument,
        externalRefResolver: new BaseResolver(),
        rootType: normalizeTypes(Oas3Types).DefinitionRoot,
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
      'foobar.yaml',
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).DefinitionRoot,
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
      'foobar.yaml',
    );

    try {
      await resolveDocument({
        rootDocument,
        externalRefResolver: new BaseResolver(),
        rootType: normalizeTypes(Oas3Types).DefinitionRoot,
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
      path.join(cwd, 'foobar.yaml'),
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).DefinitionRoot,
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
      `${cwd}/openapi-with-back.yaml`,
    );

    const resolvedRefs = await resolveDocument({
      rootDocument: rootDocument as Document,
      externalRefResolver: externalRefResolver,
      rootType: normalizeTypes(Oas3Types).DefinitionRoot,
    });

    expect(resolvedRefs).toBeDefined();

    expect(Array.from(resolvedRefs.keys()).map((ref) => ref.substring(cwd.length + 1)).sort())
      .toMatchInlineSnapshot(`
      Array [
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
      Array [
        Object {
          "allOf": Array [
            Object {
              "properties": Object {
                "integration_type": Object {
                  "$ref": "../openapi-with-back.yaml#/components/schemas/TypeB",
                },
                "name": Object {
                  "type": "string",
                },
              },
              "required": Array [
                "name",
                "integration_type",
              ],
              "type": "object",
            },
          ],
        },
        Object {
          "enum": Array [
            "webhook",
            "api_key",
            "sftp",
            "netsuite",
          ],
          "type": "string",
        },
        Object {
          "enum": Array [
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
      rootType: normalizeTypes(Oas3Types).DefinitionRoot,
    });

    expect(resolvedRefs).toBeDefined();
    expect(Array.from(resolvedRefs.keys()).map((ref) => ref.substring(cwd.length + 1)))
      .toMatchInlineSnapshot(`
      Array [
        "openapi.yaml::#/components/schemas/Local",
        "openapi.yaml::#/components/schemas/Local/properties/string",
        "openapi.yaml::./External.yaml#/properties/string",
        "openapi.yaml::./External.yaml",
        "External.yaml::./External2.yaml",
        "External2.yaml::./External.yaml#/properties",
      ]
    `);

    expect(Array.from(resolvedRefs.values()).map((val) => val.node)).toMatchInlineSnapshot(`
      Array [
        Object {
          "properties": Object {
            "localCircular": Object {
              "$ref": "#/components/schemas/Local",
            },
            "number": Object {
              "type": "number",
            },
            "string": Object {
              "type": "string",
            },
          },
        },
        Object {
          "type": "string",
        },
        Object {
          "type": "string",
        },
        Object {
          "properties": Object {
            "external": Object {
              "$ref": "./External2.yaml",
            },
            "number": Object {
              "type": "number",
            },
            "string": Object {
              "type": "string",
            },
            "unknown": Object {
              "type": "string",
            },
          },
          "type": "object",
        },
        Object {
          "properties": Object {
            "circularParent": Object {
              "$ref": "./External.yaml#/properties",
            },
          },
          "type": "object",
        },
        Object {
          "external": Object {
            "$ref": "./External2.yaml",
          },
          "number": Object {
            "type": "number",
          },
          "string": Object {
            "type": "string",
          },
          "unknown": Object {
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
      `${cwd}/openapi-with-md-description.yaml`,
    );

    expect(rootDocument).toBeDefined();

    // @ts-ignore
    Oas3Types.Info.properties.description['referenceable'] = true;
    const resolvedRefs = await resolveDocument({
      rootDocument: rootDocument as Document,
      externalRefResolver: externalRefResolver,
      rootType: normalizeTypes(Oas3Types).DefinitionRoot,
    });

    expect(resolvedRefs).toBeDefined();
    // expect(resolvedRefs.size).toEqual(2);
    expect(Array.from(resolvedRefs.keys()).map((ref) => ref.substring(cwd.length + 1)))
      .toMatchInlineSnapshot(`
      Array [
        "openapi-with-md-description.yaml::./description.md",
      ]
    `);
    expect(Array.from(resolvedRefs.values()).map((val) => val.node)).toMatchInlineSnapshot(`
      Array [
        "# Hello World

      Lorem ipsum",
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
      path.join(cwd, 'foobar.yaml'),
    );

    const resolvedRefs = await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver(),
      rootType: normalizeTypes(Oas3Types).DefinitionRoot,
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
});
