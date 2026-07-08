import { outdent } from 'outdent';

import { parseYamlToDocument } from '../../__tests__/utils.js';
import { detectSpec, getMajorSpecVersion } from '../detect-spec.js';

describe('detectSpec', () => {
  it('detect OpenAPI should throw an error when version is not string', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(
      `Invalid OpenAPI version: should be a string but got "number"`
    );
  });

  it('detect unsupported OpenAPI version', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 1.0.4
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(`Unsupported OpenAPI version: 1.0.4`);
  });

  it('detect unsupported AsyncAPI version', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        asyncapi: 1.0.4
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(`Unsupported AsyncAPI version: 1.0.4`);
  });

  it('detect unsupported spec format', () => {
    const testDocument = parseYamlToDocument(
      outdent`
        notapi: 3.1.0
      `,
      ''
    );
    expect(() => detectSpec(testDocument.parsed)).toThrow(`Unsupported specification`);
  });

  it('detects Arazzo 1.0.x as arazzo1', () => {
    expect(detectSpec({ arazzo: '1.0.1' })).toEqual('arazzo1');
    expect(detectSpec({ arazzo: '1.0.0' })).toEqual('arazzo1');
  });

  it('detects Arazzo 1.1.x as arazzo1_1', () => {
    expect(detectSpec({ arazzo: '1.1.0' })).toEqual('arazzo1_1');
    expect(detectSpec({ arazzo: '1.1.1' })).toEqual('arazzo1_1');
  });

  it('throws for an unsupported Arazzo version', () => {
    expect(() => detectSpec({ arazzo: '2.0.0' })).toThrow('Unsupported Arazzo version: 2.0.0');
  });

  it('still detects overlay 1.0.x', () => {
    expect(detectSpec({ overlay: '1.0.0' })).toEqual('overlay1');
  });

  it('detects AsyncAPI 3.1 as async3', () => {
    expect(detectSpec({ asyncapi: '3.1.0' })).toEqual('async3');
    expect(detectSpec({ asyncapi: '3.0.0' })).toEqual('async3');
  });
});

describe('getMajorSpecVersion', () => {
  it('maps both arazzo spec versions to the arazzo1 major version', () => {
    expect(getMajorSpecVersion('arazzo1')).toEqual('arazzo1');
    expect(getMajorSpecVersion('arazzo1_1')).toEqual('arazzo1');
  });
});
