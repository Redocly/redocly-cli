import { ConfigFixture } from './../../__tests__/fixtures/config';
import { Document, ResolveError } from '@redocly/openapi-core';
import { firstDocument, secondDocument } from '../documents';

export const __redoclyClient = {
  isAuthorizedWithRedocly: jest.fn().mockResolvedValue(true),
  isAuthorizedWithRedoclyByRegion: jest.fn().mockResolvedValue(true),
  login: jest.fn(),
  registryApi: {
    setAccessTokens: jest.fn(),
    authStatus: jest.fn(),
    prepareFileUpload: jest.fn().mockResolvedValue({
      signedUploadUrl: 'signedUploadUrl',
      filePath: 'filePath',
    }),
    pushApi: jest.fn(),
  },
};

export const RedoclyClient = jest.fn(() => __redoclyClient);
export const loadConfig = jest.fn(() => ConfigFixture);
export const getMergedConfig = jest.fn();
export const lint = jest.fn();
export const bundle = jest.fn(() => ({ bundle: { parsed: null }, problems: null }));
export const getTotals = jest.fn(() => ({ errors: 0 }));
export const formatProblems = jest.fn();
export const slash = jest.fn();
export const findConfig = jest.fn();
export const doesYamlFileExist = jest.fn();
export const bundleDocument = jest.fn(() => Promise.resolve({ problems: {} }));
export const detectOpenAPI = jest.fn();
export const isAbsoluteUrl = jest.fn();

export class BaseResolver {
  cache = new Map<string, Promise<Document | ResolveError>>();

  getFiles = jest.fn();
  resolveExternalRef = jest.fn();
  loadExternalRef = jest.fn;
  parseDocument = jest.fn();
  resolveDocument = jest
    .fn()
    .mockImplementationOnce(() =>
      Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: firstDocument })
    )
    .mockImplementationOnce(() =>
      Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: secondDocument })
    );
}

export enum OasVersion {
  Version2 = 'oas2',
  Version3_0 = 'oas3_0',
  Version3_1 = 'oas3_1',
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
