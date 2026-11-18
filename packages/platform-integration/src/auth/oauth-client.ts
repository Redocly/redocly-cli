import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';

import { PlatformApiError } from '../api/api-client.js';
import { isValidPlatformUrl } from '../api/domains.js';
import { type CredentialsStore, FileCredentialsStore } from './credentials-store.js';
import { type Credentials, type DeviceCode, RedoclyOAuthDeviceFlow } from './device-flow.js';

const CREDENTIALS_SALT = '4618dbc9-8aed-4e27-aaf0-225f4603e5a4';
const CRYPTO_ALGORITHM = 'aes-256-cbc';

// Why the stored credentials cannot be used against the given platform URL.
export type AuthFailure =
  | { status: 'signed-out' }
  | { status: 'residency-mismatch'; stored: string; expected: string }
  | { status: 'invalid-reunite-url' }
  | { status: 'session-expired' }
  | { status: 'offline' };

export type AuthState = { status: 'authorized'; token: string } | AuthFailure;

export class RedoclyOAuthClient {
  public readonly credentialsFolderPath: string;
  public readonly credentialsFilePath: string;
  public readonly credentialsFileName: string;

  private readonly key: Buffer;
  private readonly iv: Buffer;
  private readonly credentialsStore: CredentialsStore;
  private readonly pendingAuthStates = new Map<string, Promise<AuthState>>();

  constructor(
    private readonly version?: string,
    credentialsStore?: CredentialsStore
  ) {
    const homeDirPath = homedir();

    this.credentialsFolderPath = path.join(homeDirPath, '.redocly');
    this.credentialsFileName = 'credentials';
    this.credentialsFilePath = path.join(this.credentialsFolderPath, this.credentialsFileName);
    this.credentialsStore = credentialsStore ?? new FileCredentialsStore(this.credentialsFilePath);

    this.key = crypto
      .createHash('sha256')
      .update(`${this.credentialsFolderPath}${CREDENTIALS_SALT}`)
      .digest();
    this.iv = crypto.createHash('md5').update(this.credentialsFolderPath).digest();
  }

  public async login(
    baseUrl: string,
    onDeviceCode?: (code: DeviceCode) => void,
    openBrowser?: (url: string) => void
  ): Promise<void> {
    const deviceFlow = new RedoclyOAuthDeviceFlow(baseUrl, this.version);

    const credentials = await deviceFlow.run(onDeviceCode, openBrowser);
    if (!credentials) {
      throw new Error('Failed to login. No credentials received.');
    }
    await this.saveCredentials(credentials);
  }

  public async logout() {
    try {
      await this.removeCredentials();
    } catch (err) {
      // do nothing
    }
  }

  public async isAuthorized(platformUrl: string, apiKey?: string): Promise<boolean> {
    if (apiKey) {
      const deviceFlow = new RedoclyOAuthDeviceFlow(platformUrl, this.version);
      return deviceFlow.verifyApiKey(apiKey);
    }

    const accessToken = await this.getAccessToken(platformUrl);

    return Boolean(accessToken);
  }

  public getAccessToken = async (platformUrl: string): Promise<string | null> => {
    const authState = await this.getAuthState(platformUrl);

    return authState.status === 'authorized' ? authState.token : null;
  };

  // Concurrent calls share one check, so a rotated refresh token is never sent twice.
  public getAuthState(platformUrl: string): Promise<AuthState> {
    let authState = this.pendingAuthStates.get(platformUrl);

    if (!authState) {
      authState = this.checkAuthState(platformUrl).finally(() =>
        this.pendingAuthStates.delete(platformUrl)
      );
      this.pendingAuthStates.set(platformUrl, authState);
    }

    return authState;
  }

  // Refreshes the session only when the platform rejects the token with 401,
  // and removes the credentials only when it rejects the refresh token with 400.
  private async checkAuthState(platformUrl: string): Promise<AuthState> {
    if (!isValidPlatformUrl(platformUrl)) {
      return { status: 'invalid-reunite-url' };
    }

    const credentials = await this.readCredentials();

    if (!credentials) {
      return { status: 'signed-out' };
    }

    if (credentials.residency && credentials.residency !== platformUrl) {
      return { status: 'residency-mismatch', stored: credentials.residency, expected: platformUrl };
    }

    const deviceFlow = new RedoclyOAuthDeviceFlow(platformUrl, this.version);
    const verification = await deviceFlow.verifyToken(credentials.access_token);

    if (verification === 'valid') {
      return { status: 'authorized', token: credentials.access_token };
    }

    if (verification === 'unreachable') {
      return { status: 'offline' };
    }

    try {
      const newCredentials = await deviceFlow.refreshToken(credentials.refresh_token);
      await this.saveCredentials(newCredentials);

      return { status: 'authorized', token: newCredentials.access_token };
    } catch (error) {
      if (!(error instanceof PlatformApiError) || error.status >= 500) {
        return { status: 'offline' };
      }

      // Keep the credentials when a login replaced them while the refresh was in flight.
      if (
        error.status === 400 &&
        (await this.readCredentials())?.refresh_token === credentials.refresh_token
      ) {
        await this.removeCredentials().catch(() => {
          // The session is expired either way.
        });
      }

      return { status: 'session-expired' };
    }
  }

  private async saveCredentials(credentials: Credentials): Promise<void> {
    try {
      const encryptedCredentials = this.encryptCredentials(credentials);
      await this.credentialsStore.write(encryptedCredentials);
    } catch (error) {
      throw new Error(`Failed to save credentials: ${error.message}`);
    }
  }

  private async readCredentials(): Promise<Credentials | null> {
    try {
      const encryptedCredentials = await this.credentialsStore.read();
      return encryptedCredentials ? this.decryptCredentials(encryptedCredentials) : null;
    } catch {
      return null;
    }
  }

  private async removeCredentials(): Promise<void> {
    await this.credentialsStore.delete();
  }

  private encryptCredentials(credentials: Credentials): string {
    const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, this.key, this.iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(credentials), 'utf8'),
      cipher.final(),
    ]);

    return encrypted.toString('hex');
  }

  private decryptCredentials(encryptedCredentials: string): Credentials {
    const decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, this.key, this.iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedCredentials, 'hex')),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }
}
