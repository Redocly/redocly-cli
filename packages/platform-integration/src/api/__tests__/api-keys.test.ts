import { fetch } from 'undici';
import type * as undici from 'undici';

import { getApiKey, type ApiKeyTarget } from '../api-keys.js';

vi.mock('undici', async (importOriginal) => ({
  ...(await importOriginal<typeof undici>()),
  fetch: vi.fn(),
}));

let target: ApiKeyTarget;
let projectCount = 0;

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

function credentialResponse(apiKey: string, expiresAt: Date) {
  return jsonResponse(201, {
    object: 'oidcCredential',
    apiKey,
    expiresAt: expiresAt.toISOString(),
    oidcTrustId: 'oidct_1',
  });
}

function mockGitHubAndExchange(...exchangeResponses: Response[]) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input);

    if (new URL(url).host === 'token.actions.test') {
      return jsonResponse(200, { value: 'github-jwt' }) as never;
    }

    return exchangeResponses.shift() as never;
  });
}

describe('getApiKey()', () => {
  beforeEach(() => {
    projectCount += 1;
    target = {
      domain: 'https://app.cloud.redocly.com',
      organization: 'org_01h1s5z6vf2mm1mz3hevnn9va7',
      project: `prj_${projectCount}`,
      command: 'push',
    };
    vi.stubEnv('REDOCLY_AUTHORIZATION', '');
    vi.stubEnv('ACTIONS_ID_TOKEN_REQUEST_URL', 'https://token.actions.test/token?api-version=2');
    vi.stubEnv('ACTIONS_ID_TOKEN_REQUEST_TOKEN', 'runner-token');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.mocked(fetch).mockReset();
  });

  it('returns REDOCLY_AUTHORIZATION without any request', async () => {
    vi.stubEnv('REDOCLY_AUTHORIZATION', 'test-api-key');

    await expect(getApiKey(target)).resolves.toBe('test-api-key');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requests the GitHub token for the origin of the domain', async () => {
    mockGitHubAndExchange(credentialResponse('sk_oidc.a.b', new Date('2026-01-01T00:15:00Z')));

    await getApiKey({ ...target, domain: 'https://app.cloud.eu.redocly.com/' });

    const [[tokenUrl]] = vi.mocked(fetch).mock.calls;
    expect(new URL(String(tokenUrl)).searchParams.get('audience')).toBe(
      'https://app.cloud.eu.redocly.com'
    );
  });

  it('reuses the key until 60 seconds before it expires, then exchanges again', async () => {
    mockGitHubAndExchange(
      credentialResponse('sk_oidc.first', new Date('2026-01-01T00:15:00Z')),
      credentialResponse('sk_oidc.second', new Date('2026-01-01T00:30:00Z'))
    );

    await expect(getApiKey(target)).resolves.toBe('sk_oidc.first');

    vi.setSystemTime(new Date('2026-01-01T00:13:59Z'));
    await expect(getApiKey(target)).resolves.toBe('sk_oidc.first');
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date('2026-01-01T00:14:01Z'));
    await expect(getApiKey(target)).resolves.toBe('sk_oidc.second');
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it.each([
    ['project', { project: 'other' }],
    ['domain', { domain: 'https://app.cloud.eu.redocly.com' }],
  ])('keeps a separate key for each %s', async (_name, change) => {
    mockGitHubAndExchange(
      credentialResponse('sk_oidc.one', new Date('2026-01-01T00:15:00Z')),
      credentialResponse('sk_oidc.two', new Date('2026-01-01T00:15:00Z'))
    );

    await expect(getApiKey(target)).resolves.toBe('sk_oidc.one');
    await expect(getApiKey({ ...target, ...change })).resolves.toBe('sk_oidc.two');
  });

  it('fails when the GitHub token request is refused', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('', { status: 403, statusText: 'Forbidden' }) as never
    );

    await expect(getApiKey(target)).rejects.toThrow(
      'Failed to get the GitHub OIDC token. Forbidden.'
    );
  });

  it('names the step that failed when the GitHub token response is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('<html>proxy</html>') as never);

    await expect(getApiKey(target)).rejects.toThrow(/^Failed to get the GitHub OIDC token\. /);
  });

  it.each(['ACTIONS_ID_TOKEN_REQUEST_URL', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN'])(
    'explains how to authenticate when %s is not set',
    async (variable) => {
      vi.stubEnv(variable, '');

      await expect(getApiKey(target)).rejects.toThrow(
        'No api key provided. Set the environment variable REDOCLY_AUTHORIZATION. In a GitHub Actions workflow, you can also grant the job `permissions: id-token: write` and trust the repository on the CI/CD access tab of Remote content in the project.'
      );
      expect(fetch).not.toHaveBeenCalled();
    }
  );
});
