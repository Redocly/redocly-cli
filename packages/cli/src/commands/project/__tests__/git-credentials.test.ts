import { logger } from '@redocly/openapi-core';
import type * as PlatformIntegration from '@redocly/platform-integration';
import { getPlatformCredentials } from '@redocly/platform-integration';
import { Readable } from 'node:stream';

import { handleProjectGitCredentials } from '../git-credentials.js';

vi.mock('@redocly/platform-integration', async () => ({
  ...(await vi.importActual<typeof PlatformIntegration>('@redocly/platform-integration')),
  getPlatformCredentials: vi.fn(),
}));

const GET_REQUEST =
  'protocol=https\nhost=app.cloud.redocly.com\nwwwauth[]=Basic realm="Redocly"\n\n';

function credential(operation: string, request = GET_REQUEST) {
  return handleProjectGitCredentials({
    operation,
    input: Readable.from([request]),
    version: '2.0.0',
  });
}

describe('handleProjectGitCredentials', () => {
  beforeEach(() => {
    vi.mocked(getPlatformCredentials).mockResolvedValue({ accessToken: 'token-123' });
    vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  it('answers with the login token for the Redocly platform host', async () => {
    await expect(credential('get')).resolves.toBe('username=redocly\npassword=token-123\n');
    expect(getPlatformCredentials).toHaveBeenCalledWith('https://app.cloud.redocly.com', '2.0.0');
  });

  it('answers with the API key', async () => {
    vi.mocked(getPlatformCredentials).mockResolvedValue({ apiKey: 'sk_test' });

    await expect(credential('get')).resolves.toBe('username=redocly\npassword=sk_test\n');
  });

  it('tells git to stop and asks the user to log in when there is no credential', async () => {
    vi.mocked(getPlatformCredentials).mockResolvedValue(undefined);

    await expect(credential('get')).resolves.toBe('quit=1\n');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('redocly login --residency https://app.cloud.redocly.com')
    );
  });

  it('gives nothing for a host that is not a valid Redocly platform URL', async () => {
    await expect(credential('get', 'protocol=http\nhost=example.com\n')).resolves.toBe('');
    expect(getPlatformCredentials).not.toHaveBeenCalled();
  });

  it.each(['store', 'erase'])('ignores %s', async (operation) => {
    await expect(credential(operation)).resolves.toBe('');
    expect(getPlatformCredentials).not.toHaveBeenCalled();
  });
});
