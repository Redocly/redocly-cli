import { detectSpec, getMajorSpecVersion } from '../detect-spec.js';

describe('detectSpec', () => {
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
});

describe('getMajorSpecVersion', () => {
  it('maps both arazzo spec versions to the arazzo1 major version', () => {
    expect(getMajorSpecVersion('arazzo1')).toEqual('arazzo1');
    expect(getMajorSpecVersion('arazzo1_1')).toEqual('arazzo1');
  });
});
