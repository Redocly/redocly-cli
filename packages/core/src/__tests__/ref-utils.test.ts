import outdent from 'outdent';
import { parseYamlToDocument } from '../../__tests__/utils.js';
import {
  escapePointerFragment,
  parseRef,
  refBaseName,
  unescapePointerFragment,
} from '../ref-utils.js';
import { lintDocument } from '../lint.js';
import { createConfig } from '../config/index.js';
import { BaseResolver } from '../resolve.js';

describe('ref-utils', () => {
  it(`should unescape refs with '/'`, () => {
    const reference = 'somefile.yaml#/components/schemas/scope~1domain-schema';
    expect(parseRef(reference)).toMatchInlineSnapshot(`
      {
        "pointer": [
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
      {
        "pointer": [
          "components",
          "schemas",
          "complex~name",
        ],
        "uri": "somefile.yaml",
      }
    `);
  });

  it(`should unescape complex urlencoded paths`, () => {
    const reference = 'somefile.yaml#/components/schemas/scope%2Fcomplex~name';
    expect(parseRef(reference)).toMatchInlineSnapshot(`
      {
        "pointer": [
          "components",
          "schemas",
          "scope/complex~name",
        ],
        "uri": "somefile.yaml",
      }
    `);
  });

  it(`should unescape escaped paths`, () => {
    const reference = 'somefile.yaml#/components/schemas/scope~1complex~0name with spaces';
    expect(parseRef(reference)).toMatchInlineSnapshot(`
      {
        "pointer": [
          "components",
          "schemas",
          "scope/complex~name with spaces",
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
      config: await createConfig({ rules: { struct: 'error' } }),
    });

    expect(result).toMatchInlineSnapshot(`[]`);
  });

  it('should parse a ref correctly', () => {
    expect(parseRef('./info.yaml#/description')).toEqual({
      uri: './info.yaml',
      pointer: ['description'],
    });
  });

  it('should parse a ref which contain a hash in the middle', () => {
    // Here `info#description.md` is a file name
    expect(parseRef('./info#description.md')).toEqual({
      uri: './info#description.md',
      pointer: [],
    });
  });

  it('should parse a ref which ends with a hash', () => {
    expect(parseRef('./info.yaml#')).toEqual({
      uri: './info.yaml',
      pointer: [],
    });
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

  describe('escapePointerFragment', () => {
    it('should escape a simple pointer fragment with ~ and / correctly', () => {
      expect(escapePointerFragment('scope/complex~name')).toStrictEqual('scope~1complex~0name');
    });

    it('should escape a pointer fragment with a number correctly', () => {
      expect(escapePointerFragment(123)).toStrictEqual(123);
    });

    it('should not URI-encode other special characters when escaping pointer fragments per https://datatracker.ietf.org/doc/html/rfc6901#section-6', () => {
      expect(escapePointerFragment('curly{braces}')).toStrictEqual('curly{braces}');
      expect(escapePointerFragment('plus+')).toStrictEqual('plus+');
    });
  });

  describe('unescapePointerFragment', () => {
    it('should unescape a pointer with a percent sign correctly', () => {
      expect(unescapePointerFragment('activity_level_%25')).toStrictEqual('activity_level_%');
    });

    it('should unescape a pointer correctly', () => {
      expect(unescapePointerFragment('scope~1complex~0name')).toStrictEqual('scope/complex~name');
    });
  });
});
