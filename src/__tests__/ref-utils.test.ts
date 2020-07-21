import { parseRef } from '../ref-utils';

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
});
