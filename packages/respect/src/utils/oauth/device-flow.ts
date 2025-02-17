import { blue, red, green } from 'colorette';
import open from 'open';

import { DefaultLogger } from '../logger/logger';

const logger = DefaultLogger.getInstance();

export class RedoclyOAuthDeviceFlow {
  constructor(
    private baseUrl: string,
    private clientName: string,
  ) {}

  async run() {
    const code = await this.getDeviceCode();
    logger.log(
      'Attempting to automatically open the SSO authorization page in your default browser.\n',
    );
    logger.log(
      'If the browser does not open or you wish to use a different device to authorize this request, open the following URL:\n\n',
    );
    logger.log(blue(code.verificationUri));
    logger.log(`\n\n`);
    logger.log(`Then enter the code:\n\n`);
    logger.log(blue(code.userCode));
    logger.log(`\n\n`);
    open(code.verificationUriComplete);

    try {
      const accessToken = await this.pollingAccessToken(
        code.deviceCode,
        code.interval,
        code.expiresIn,
      );
      logger.log(green('✅  Logged in\n\n'));

      return accessToken;
    } catch (error) {
      logger.log(red('❌  ' + error));
      throw error;
    }
  }

  async verifyToken(accessToken: string) {
    try {
      const res = await this.sendRequest('/session', 'GET', undefined, {
        Cookie: `accessToken=${accessToken};`,
      });

      if (res.user) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  async verifyApiKey(apiKey: string) {
    try {
      const res = await this.sendRequest('/api-keys-verify', 'POST', {
        apiKey,
      });
      if (res.success) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
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

  private async pollingAccessToken(deviceCode: string, interval: number, expiresIn: number) {
    return new Promise((resolve, reject) => {
      let intervalId = setInterval(async () => {
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
    body: Record<string, any> | undefined = undefined,
    headers: Record<string, string> = {},
  ) {
    url = `${this.baseUrl}${url}`;
    const res = await fetch(url, {
      body: body ? JSON.stringify(body) : body,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    if (res.status === 204) {
      return { success: true };
    }
    return await res.json();
  }
}
