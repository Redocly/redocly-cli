import { BaseResolver } from '@redocly/openapi-core';
import * as openapiCore from '@redocly/openapi-core';
import { run } from '@redocly/respect-core';
import { fetch as undiciFetch } from 'undici';

import { handleRespect, type RespectArgv } from '../../../commands/respect/index.js';

// Mock node:fs
vi.mock('node:fs', async () => {
  return {
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => false), // Return false to prevent plugin loading
    readFileSync: vi.fn(() => ''),
    accessSync: vi.fn(() => true),
    constants: {
      F_OK: 0,
      R_OK: 4,
    },
  };
});

// Mock the run function
vi.mock('@redocly/respect-core', async () => {
  const actual =
    await vi.importActual<typeof import('@redocly/respect-core')>('@redocly/respect-core');
  return {
    ...actual,
    run: vi.fn(),
  };
});

// Mock @redocly/openapi-core
vi.mock('@redocly/openapi-core', async () => {
  const actual = await vi.importActual('@redocly/openapi-core');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      output: vi.fn(),
      printNewLine: vi.fn(),
      indent: vi.fn((text) => text),
    },
    stringifyYaml: vi.fn(() => 'mocked yaml'),
  };
});

// Mock displayFilesSummaryTable
vi.mock('../../../commands/respect/display-files-summary-table.js', () => ({
  displayFilesSummaryTable: vi.fn(),
}));

describe('handleRespect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should call run with the correct arguments', async () => {
    const mockConfig = await openapiCore.createConfig({});
    const commandArgs = {
      argv: {
        files: ['test.arazzo.yaml'],
        input: 'name=John',
        server: 'server1=http://localhost:3000',
        workflow: ['workflow3'],
        verbose: true,
        'max-steps': 2000,
        severity: 'STATUS_CODE_CHECK=warn',
        'max-fetch-timeout': 40_000,
        'execution-timeout': 3_600_000,
      } as RespectArgv,
      config: mockConfig,
      version: '1.0.0',
      collectSpecData: vi.fn(),
    };

    vi.mocked(run).mockResolvedValue([
      {
        hasProblems: false,
        hasWarnings: false,
        file: 'test.arazzo.yaml',
        executedWorkflows: [],
        options: {} as any,
        ctx: {} as any,
        totalTimeMs: 100,
        totalRequests: 1,
        globalTimeoutError: false,
        secretValues: [],
      },
    ]);

    await handleRespect(commandArgs);

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        files: ['test.arazzo.yaml'],
        input: 'name=John',
        server: 'server1=http://localhost:3000',
        workflow: ['workflow3'],
        verbose: true,
        config: expect.anything(),
        version: '1.0.0',
        collectSpecData: expect.anything(),
        severity: 'STATUS_CODE_CHECK=warn',
        maxSteps: 2000,
        maxFetchTimeout: 40_000,
        executionTimeout: 3_600_000,
      })
    );
  });
});

describe('handleRespect externalRefResolver wiring', () => {
  const PEM_CERT = '-----BEGIN CERTIFICATE-----\nY2VydA==\n-----END CERTIFICATE-----';
  const PEM_KEY = '-----BEGIN PRIVATE KEY-----\na2V5\n-----END PRIVATE KEY-----';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('HTTPS_PROXY', undefined);
    vi.stubEnv('HTTP_PROXY', undefined);
    vi.stubEnv('https_proxy', undefined);
    vi.stubEnv('http_proxy', undefined);
    vi.stubEnv('NO_PROXY', undefined);
    vi.stubEnv('no_proxy', undefined);

    vi.mocked(run).mockResolvedValue([
      {
        hasProblems: false,
        hasWarnings: false,
        file: 'test.arazzo.yaml',
        executedWorkflows: [],
        options: {} as any,
        ctx: {} as any,
        totalTimeMs: 0,
        totalRequests: 0,
        globalTimeoutError: false,
        secretValues: [],
      },
    ]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function invokeHandleRespect(argvOverrides: Partial<RespectArgv> = {}) {
    const config = await openapiCore.createConfig({});
    await handleRespect({
      argv: {
        files: ['test.arazzo.yaml'],
        'max-steps': 2000,
        'max-fetch-timeout': 40_000,
        'execution-timeout': 3_600_000,
        'no-secrets-masking': false,
        ...argvOverrides,
      } as RespectArgv,
      config,
      version: '1.0.0',
      collectSpecData: vi.fn(),
    });
    return vi.mocked(run).mock.calls[0]?.[0];
  }

  function getResolverCustomFetch(resolver: BaseResolver | undefined) {
    return (resolver as unknown as { config: { http: { customFetch?: unknown } } } | undefined)
      ?.config.http.customFetch;
  }

  it('should pass an externalRefResolver instance to run', async () => {
    const callArgs = await invokeHandleRespect();
    expect(callArgs?.externalRefResolver).toBeInstanceOf(BaseResolver);
  });

  it('should use the bare undici fetch when no proxy and no mTLS are configured', async () => {
    const callArgs = await invokeHandleRespect();
    expect(getResolverCustomFetch(callArgs?.externalRefResolver)).toBe(undiciFetch);
  });

  it('should use a proxy-aware customFetch when HTTPS_PROXY is set', async () => {
    vi.stubEnv('HTTPS_PROXY', 'http://proxy.local:8080');
    const callArgs = await invokeHandleRespect();
    const customFetch = getResolverCustomFetch(callArgs?.externalRefResolver);
    expect(customFetch).not.toBe(undiciFetch);
    expect(typeof customFetch).toBe('function');
  });

  it('should use a proxy-aware customFetch when HTTP_PROXY is set', async () => {
    vi.stubEnv('HTTP_PROXY', 'http://proxy.local:8080');
    const callArgs = await invokeHandleRespect();
    const customFetch = getResolverCustomFetch(callArgs?.externalRefResolver);
    expect(customFetch).not.toBe(undiciFetch);
    expect(typeof customFetch).toBe('function');
  });

  it('should use an mTLS-aware customFetch when argv.mtls is provided', async () => {
    const callArgs = await invokeHandleRespect({
      mtls: {
        'https://internal-api.example.com': {
          clientCert: PEM_CERT,
          clientKey: PEM_KEY,
        },
      },
    });
    const customFetch = getResolverCustomFetch(callArgs?.externalRefResolver);
    expect(customFetch).not.toBe(undiciFetch);
    expect(typeof customFetch).toBe('function');
  });
});
