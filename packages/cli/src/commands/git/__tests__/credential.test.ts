import { logger } from '@redocly/openapi-core';
import type * as ReuniteIntegration from '@redocly/reunite-integration';
import { RedoclyOAuthClient } from '@redocly/reunite-integration';
import { Readable } from 'node:stream';

import { handleGitCredential } from '../credential.js';

vi.mock('@redocly/reunite-integration', async () => ({
  ...(await vi.importActual<typeof ReuniteIntegration>('@redocly/reunite-integration')),
  RedoclyOAuthClient: vi.fn(),
}));

const GET_REQUEST =
  'protocol=https\nhost=app.cloud.redocly.com\nwwwauth[]=Basic realm="Redocly"\n\n';

function credential(operation: string, request = GET_REQUEST) {
  return handleGitCredential({ operation, input: Readable.from([request]), version: '2.0.0' });
}

describe('handleGitCredential', () => {
  const originalEnv = process.env;
  const getAccessToken = vi.fn();

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDOCLY_AUTHORIZATION;
    getAccessToken.mockResolvedValue('token-123');
    vi.mocked(RedoclyOAuthClient).mockImplementation(function (this: any) {
      this.getAccessToken = getAccessToken;
    } as any);
    vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('answers with the login token for the Reunite host', async () => {
    await expect(credential('get')).resolves.toBe('username=redocly\npassword=token-123\n');
    expect(RedoclyOAuthClient).toHaveBeenCalledWith('2.0.0');
    expect(getAccessToken).toHaveBeenCalledWith('https://app.cloud.redocly.com');
  });

  it('answers with the API key from REDOCLY_AUTHORIZATION', async () => {
    process.env.REDOCLY_AUTHORIZATION = 'sk_test';

    await expect(credential('get')).resolves.toBe('username=redocly\npassword=sk_test\n');
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it('tells git to stop and asks the user to log in when there is no credential', async () => {
    getAccessToken.mockResolvedValue(null);

    await expect(credential('get')).resolves.toBe('quit=1\n');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('redocly login --residency https://app.cloud.redocly.com')
    );
  });

  it('gives nothing for a host that is not a valid Reunite URL', async () => {
    await expect(credential('get', 'protocol=http\nhost=example.com\n')).resolves.toBe('');
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it.each(['store', 'erase'])('ignores %s', async (operation) => {
    await expect(credential(operation)).resolves.toBe('');
    expect(getAccessToken).not.toHaveBeenCalled();
  });
});
