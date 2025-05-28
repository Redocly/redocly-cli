import {
  normalizeHeaders,
  isJsonContentType,
  isXmlContentType,
  ApiFetcher,
} from '../api-fetcher.js';

describe('normalizeHeaders', () => {
  it('should return empty object if no headers', () => {
    const result = normalizeHeaders(undefined);
    expect(result).toEqual({});
  });

  it('should return empty object if empty headers', () => {
    const result = normalizeHeaders({});
    expect(result).toEqual({});
  });

  it('should return normalized headers', () => {
    const result = normalizeHeaders({
      'Content-Type': 'application/json',
      'x-api-key': '123',
    });
    expect(result).toEqual({
      'content-type': 'application/json',
      'x-api-key': '123',
    });
  });
});

describe('isJsonContentType', () => {
  it('should return true if json mime type', () => {
    const result = isJsonContentType('application/json');
    expect(result).toEqual(true);
  });

  it('should return true if json mime type with suffix', () => {
    const result = isJsonContentType('application/vnd.api+json');
    expect(result).toEqual(true);
  });

  it('should return false if not json mime type', () => {
    const result = isJsonContentType('application/xml');
    expect(result).toEqual(false);
  });
});

describe('isXmlContentType', () => {
  it('should return true if xml mime type', () => {
    const result = isXmlContentType('application/xml');
    expect(result).toEqual(true);
  });

  it('should return true if xml mime type with suffix', () => {
    const result = isXmlContentType('application/vnd.api+xml');
    expect(result).toEqual(true);
  });

  it('should return false if not xml mime type', () => {
    const result = isXmlContentType('application/json');
    expect(result).toEqual(false);
  });
});

describe('ApiFetcher', () => {
  describe('initVerboseLogs', () => {
    it('should init verboseLogs', () => {
      const apiFetcher = new ApiFetcher({});
      apiFetcher.initVerboseLogs({
        host: 'localhost',
        path: '/pets',
        method: 'get',
        body: { name: 'test' },
        headerParams: { 'x-api-key': '123' },
      });
      expect(apiFetcher.verboseLogs).toEqual({
        host: 'localhost',
        path: '/pets',
        method: 'get',
        body: '{"name":"test"}',
        headerParams: { 'x-api-key': '123' },
      });
    });
  });

  describe('getVerboseLogs', () => {
    it('should get verboseLogs', () => {
      const apiFetcher = new ApiFetcher({});
      apiFetcher.verboseLogs = {
        host: 'localhost',
        path: '/pets',
        method: 'get',
        body: '{"name":"test"}',
        headerParams: { 'x-api-key': '123' },
      };
      expect(apiFetcher.getVerboseLogs()).toEqual({
        host: 'localhost',
        path: '/pets',
        method: 'get',
        body: '{"name":"test"}',
        headerParams: { 'x-api-key': '123' },
      });
    });
  });

  describe('getVerboseResponseLogs', () => {
    it('should get verboseResponseLogs', () => {
      const apiFetcher = new ApiFetcher({});
      apiFetcher.verboseResponseLogs = {
        host: 'localhost',
        path: '/pets',
        method: 'get',
        body: '{"name":"test"}',
        headerParams: { 'x-api-key': '123' },
      };
      expect(apiFetcher.getVerboseResponseLogs()).toEqual({
        host: 'localhost',
        path: '/pets',
        method: 'get',
        body: '{"name":"test"}',
        headerParams: { 'x-api-key': '123' },
      });
    });
  });

  describe('initVerboseResponseLogs', () => {
    it('should init verboseResponseLogs', () => {
      const apiFetcher = new ApiFetcher({});
      apiFetcher.initVerboseResponseLogs({
        host: 'localhost',
        path: '/pets',
        method: 'get',
        body: { name: 'test' },
        headerParams: { 'x-api-key': '123' },
        statusCode: 200,
      });
      expect(apiFetcher.verboseResponseLogs).toEqual({
        host: 'localhost',
        path: '/pets',
        method: 'get',
        body: { name: 'test' },
        headerParams: { 'x-api-key': '123' },
        statusCode: 200,
      });
    });
  });

  describe('fetchResults', () => {
    it('should throw an error if no serverUrl', async () => {
      const apiFetcher = new ApiFetcher({});
      const ctx = {} as any;
      const step = {} as any;
      const requestData = {
        serverUrl: undefined,
        path: '/pets',
        method: 'get',
        parameters: [],
        requestBody: {},
      };
      await expect(
        apiFetcher.fetchResult({ ctx, step, requestData, workflowId: 'test' })
      ).rejects.toThrowError('No server url provided');
    });
  });
});
