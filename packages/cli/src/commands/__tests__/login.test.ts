import { RedoclyOAuthClient, type DeviceCode } from '@redocly/reunite-integration';

import { handleLogin } from '../login.js';

vi.mock('@redocly/reunite-integration', async () => {
  const actual = await vi.importActual('@redocly/reunite-integration');
  return { ...actual, RedoclyOAuthClient: vi.fn() };
});

describe('handleLogin()', () => {
  it('prints the device code instructions and the login confirmation', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const login = vi.fn(async (_url: string, onDeviceCode?: (code: DeviceCode) => void) => {
      onDeviceCode?.({
        verificationUri: 'https://app.redocly.test/device',
        verificationUriComplete: 'https://app.redocly.test/device?code=ABCD-EFGH',
        userCode: 'ABCD-EFGH',
      });
    });
    vi.mocked(RedoclyOAuthClient).mockImplementation(function (this: any): any {
      this.login = login;
      this.credentialsFilePath = '/home/user/.redocly/credentials';
    });

    await handleLogin({ argv: {}, config: { resolvedConfig: {} } as any, version: '1.2.3' });

    expect(login).toHaveBeenCalledWith('https://app.cloud.redocly.com', expect.any(Function));
    const stdoutWrite = vi.mocked(process.stdout.write);
    const output = stdoutWrite.mock.calls.map(([text]) => String(text)).join('');
    expect(output).toContain('https://app.redocly.test/device');
    expect(output).toContain('ABCD-EFGH');
    expect(output).toContain('✅ Logged in');
  });
});
