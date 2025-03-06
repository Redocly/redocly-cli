import { ConfigFixture } from './../../__tests__/fixtures/config';
import { firstDocument, secondDocument, thirdDocument } from '../documents';

import type { Document } from '@redocly/openapi-core';

export const __redoclyClient = {
  isAuthorizedWithRedocly: vi.fn().mockResolvedValue(true),
  isAuthorizedWithRedoclyByRegion: vi.fn().mockResolvedValue(true),
  login: vi.fn(),
  registryApi: {
    setAccessTokens: vi.fn(),
    authStatus: vi.fn(),
    prepareFileUpload: vi.fn().mockResolvedValue({
      signedUploadUrl: 'signedUploadUrl',
      filePath: 'filePath',
    }),
    pushApi: vi.fn(),
  },
};

export const RedoclyClient = vi.fn(() => __redoclyClient);
export const loadConfig = vi.fn(() => ConfigFixture);
export const getMergedConfig = vi.fn();
export const getProxyAgent = vi.fn();
export const lint = vi.fn();
export const bundle = vi.fn(() => ({ bundle: { parsed: null }, problems: null }));
export const getTotals = vi.fn(() => ({ errors: 0 }));
export const formatProblems = vi.fn();
export const slash = vi.fn();
export const findConfig = vi.fn();
export const doesYamlFileExist = vi.fn();
export const bundleDocument = vi.fn(() => Promise.resolve({ problems: {} }));
export const detectSpec = vi.fn();
export const isAbsoluteUrl = vi.fn();
export const stringifyYaml = vi.fn((data) => data);

export class BaseResolver {
  cache = new Map<string, Promise<Document | ResolveError>>();

  getFiles = vi.fn();
  resolveExternalRef = vi.fn();
  loadExternalRef = vi.fn;
  parseDocument = vi.fn();
  resolveDocument = vi
    .fn()
    .mockImplementationOnce(() =>
      Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: firstDocument })
    )
    .mockImplementationOnce(() =>
      Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: secondDocument })
    )
    .mockImplementationOnce(() =>
      Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: thirdDocument })
    );
}

export class ResolveError extends Error {
  constructor(public originalError: Error) {
    super(originalError.message);
    Object.setPrototypeOf(this, ResolveError.prototype);
  }
}

export class YamlParseError extends Error {
  constructor(public originalError: Error) {
    super(originalError.message);
    Object.setPrototypeOf(this, YamlParseError.prototype);
  }
}

export enum SpecVersion {
  OAS2 = 'oas2',
  OAS3_0 = 'oas3_0',
  OAS3_1 = 'oas3_1',
  Async2 = 'async2',
  Async3 = 'async3',
}

export enum Oas3Operations {
  get = 'get',
  put = 'put',
  post = 'post',
  delete = 'delete',
  options = 'options',
  head = 'head',
  patch = 'patch',
  trace = 'trace',
}
