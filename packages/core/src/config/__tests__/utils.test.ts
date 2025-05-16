import type { RawConfig, FlatRawConfig } from '../types.js';
import * as utils from '../utils.js';

const rawTestConfig: RawConfig = {
  apis: {
    'test@v1': {
      root: 'root.yaml',
      styleguide: {
        extends: ['recommended'],
        rules: { 'operation-2xx-response': 'error' },
      },
    },
  },
  styleguide: {
    plugins: ['test-plugin'],
    extends: ['minimal'],
    rules: { 'operation-4xx-response': 'warn' },
    doNotResolveExamples: true,
  },
  resolve: {
    http: { headers: [{ matches: '*', name: 'all', envVariable: 'all' }] },
  },
  theme: {
    openapi: {
      disableSidebar: true,
    },
  },
};

const flatTestConfig: FlatRawConfig = {
  apis: {
    'test@v1': {
      root: 'root.yaml',
      extends: ['recommended'],
      rules: { 'operation-2xx-response': 'error' },
    },
  },
  plugins: ['test-plugin'],
  extends: ['minimal'],
  rules: {
    'operation-4xx-response': 'warn',
  },
  resolve: {
    http: { headers: [{ matches: '*', name: 'all', envVariable: 'all' }] },
    doNotResolveExamples: true,
  },
  theme: {
    openapi: {
      disableSidebar: true,
    },
  },
};

describe('transformConfig', () => {
  it('should transform flatten config into styleguide', () => {
    expect(utils.transformConfig(flatTestConfig)).toEqual({
      ...rawTestConfig,
      resolve: { ...rawTestConfig.resolve, doNotResolveExamples: true },
    });
  });
  it('should transform styleguide config into styleguide identically', () => {
    expect(utils.transformConfig(rawTestConfig)).toEqual(rawTestConfig);
  });
});

describe('mergeExtends', () => {
  it('should work with empty extends', () => {
    expect(utils.mergeExtends([]).rules).toEqual({});
  });

  it('should work with configurable rules changing severity', () => {
    expect(
      utils.mergeExtends([
        {
          rules: { 'rule/abc': { severity: 'error', subject: 'Operation' } },
        },
        {
          rules: { 'rule/abc': 'warn' },
        },
      ]).rules
    ).toEqual({
      'rule/abc': { severity: 'warn', subject: 'Operation' },
    });
  });
});
