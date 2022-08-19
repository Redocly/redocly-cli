import outdent from 'outdent';
import { parseYamlToDocument } from '../../__tests__/utils';
import { parseRef, refBaseName } from '../ref-utils';
import { lintDocument } from '../lint';
import { StyleguideConfig } from '../config';
import { BaseResolver } from '../resolve';

describe('ref-utils', () => {
  it(`should unescape refs with '/'`, () => {
    const reference = 'somefile.yaml#/components/schemas/scope~1domain-schema';
    expect(parseRef(reference)).toMatchInlineSnapshot(`
      Object {
        "pointer": Array [
          "components",
          "schemas",
          "scope/domain-schema",
        ],
        "uri": "somefile.yaml",
      }
    `);
  });

  it(`should unescape refs with '~'`, () => {
    const reference = 'somefile.yaml#/components/schemas/complex~0name';
    expect(parseRef(reference)).toMatchInlineSnapshot(`
      Object {
        "pointer": Array [
          "components",
          "schemas",
          "complex~name",
        ],
        "uri": "somefile.yaml",
      }
    `);
  });

  it(`should unescape complex urlencoded paths`, () => {
    const referene = 'somefile.yaml#/components/schemas/scope%2Fcomplex~name';
    expect(parseRef(referene)).toMatchInlineSnapshot(`
      Object {
        "pointer": Array [
          "components",
          "schemas",
          "scope/complex~name",
        ],
        "uri": "somefile.yaml",
      }
    `);
  });

  it(`should validate definition with urlencoded paths`, async () => {
    const document = parseYamlToDocument(
      outdent` 
        openapi: "3.0.0"
        info:
          version: 1.0.0
          title: Swagger Petstore
          description: Test definition
          license:
            name: MIT
            url: https://opensource.org/licenses/MIT
        servers:
          - url: http://petstore.swagger.io/v1
        paths:
          /pet:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '200':
                  description: A paged array of pets
                  content:
                    application/json:
                      schema:
                        $ref: "#/components/schemas/scope%3A%7Banimals~1Pet%7D"
        components:
          schemas:
            scope:{animals/Pet}:
              type: object
              properties:
                id:
                  type: integer
                  format: int64
                name:
                  type: string
      `,
      ''
    );

    const result = await lintDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: new StyleguideConfig({}),
    });

    expect(result).toMatchInlineSnapshot(`Array []`);
  });

  describe('refBaseName', () => {
    it('returns base name for file reference', () => {
      expect(refBaseName('../testcase/Pet.yaml')).toStrictEqual('Pet');
    });

    it('returns base name for local file reference', () => {
      expect(refBaseName('Cat.json')).toStrictEqual('Cat');
    });

    it('returns base name for url reference', () => {
      expect(refBaseName('http://example.com/tests/crocodile.json')).toStrictEqual('crocodile');
    });

    it('returns base name for file with multiple dots in name', () => {
      expect(refBaseName('feline.tiger.v1.yaml')).toStrictEqual('feline.tiger.v1');
    });

    it('returns base name for file without any dots in name', () => {
      expect(refBaseName('abcdefg')).toStrictEqual('abcdefg');
    });
  });
});
