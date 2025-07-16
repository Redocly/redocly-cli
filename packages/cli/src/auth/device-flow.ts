import { blue, green } from 'colorette';
import * as childProcess from 'node:child_process';
import { logger } from '@redocly/openapi-core';
import { ReuniteApiClient } from '../reunite/api/api-client.js';
import { DEFAULT_FETCH_TIMEOUT } from '../utils/fetch-with-timeout.js';

export type AuthToken = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
};

export class RedoclyOAuthDeviceFlow {
  private apiClient: ReuniteApiClient;

  constructor(private baseUrl: string, private clientName: string, private version: string) {
    this.apiClient = new ReuniteApiClient(this.version, 'login');
  }

  async run() {
    const code = await this.getDeviceCode();
    logger.output(
      'Attempting to automatically open the SSO authorization page in your default browser.\n'
    );
    logger.output(
      'If the browser does not open or you wish to use a different device to authorize this request, open the following URL:\n\n'
    );
    logger.output(blue(code.verificationUri));
    logger.output(`\n\n`);
    logger.output(`Then enter the code:\n\n`);
    logger.output(blue(code.userCode));
    logger.output(`\n\n`);

    this.openBrowser(code.verificationUriComplete);

    const accessToken = await this.pollingAccessToken(
      code.deviceCode,
      code.interval,
      code.expiresIn
    );
    logger.output(green('✅ Logged in\n\n'));

    return accessToken;
  }

  private openBrowser(url: string) {
    try {
      const cmd =
        process.platform === 'win32'
          ? `start ${url}`
          : process.platform === 'darwin'
          ? `open ${url}`
          : `xdg-open ${url}`;

      childProcess.execSync(cmd);
    } catch {
      // silently fail if browser cannot be opened
    }
  }

  async verifyToken(accessToken: string) {
    try {
      const response = await this.sendRequest('/session', 'GET', undefined, {
        Cookie: `accessToken=${accessToken};`,
      });

      return !!response.user;
    } catch {
      return false;
    }
  }

  async verifyApiKey(apiKey: string) {
    try {
      const response = await this.sendRequest('/api-keys-verify', 'POST', {
        apiKey,
      });
      return !!response.success;
    } catch {
      return false;
    }
  }

  async refreshToken(refreshToken: string) {
    const response = await this.sendRequest(`/device-rotate-token`, 'POST', {
      grant_type: 'refresh_token',
      client_name: this.clientName,
      refresh_token: refreshToken,
    });

    if (!response.access_token) {
      throw new Error('Failed to refresh token');
    }
    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_in: response.expires_in,
    };
  }

  private async pollingAccessToken(
    deviceCode: string,
    interval: number,
    expiresIn: number
  ): Promise<AuthToken> {
    return new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        const response = await this.getAccessToken(deviceCode);
        if (response.access_token) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          resolve(response);
        }
        if (response.error && response.error !== 'authorization_pending') {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          reject(response.error_description);
        }
      }, interval * 1000);

      const timeoutId = setTimeout(async () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        reject('Authorization has expired. Please try again.');
      }, expiresIn * 1000);
    });
  }

  private async getAccessToken(deviceCode: string) {
    return await this.sendRequest('/device-token', 'POST', {
      client_name: this.clientName,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
  }

  private async getDeviceCode() {
    const {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: verificationUri,
      verification_uri_complete: verificationUriComplete,
      interval = 10,
      expires_in: expiresIn = 300,
    } = await this.sendRequest('/device-authorize', 'POST', {
      client_name: this.clientName,
    });

    return {
      deviceCode,
      userCode,
      verificationUri,
      verificationUriComplete,
      interval,
      expiresIn,
    };
  }

  private async sendRequest(
    url: string,
    method: string = 'GET',
    body: Record<string, unknown> | undefined = undefined,
    headers: Record<string, string> = {}
  ) {
    url = `${this.baseUrl}${url}`;
    const response = await this.apiClient.request(url, {
      body: body ? JSON.stringify(body) : body,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: DEFAULT_FETCH_TIMEOUT,
    });
    if (response.status === 204) {
      return { success: true };
    }
    return await response.json();
  }
}
