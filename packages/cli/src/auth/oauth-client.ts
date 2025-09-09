import { homedir } from 'node:os';
import path from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { logger } from '@redocly/openapi-core';
import { type Credentials, RedoclyOAuthDeviceFlow } from './device-flow.js';

const SALT = '4618dbc9-8aed-4e27-aaf0-225f4603e5a4';
const CRYPTO_ALGORITHM = 'aes-256-cbc';

export class RedoclyOAuthClient {
  public static readonly CREDENTIALS_FILE = 'credentials';

  private readonly dir: string;
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor() {
    const homeDirPath = homedir();

    this.dir = path.join(homeDirPath, '.redocly');
    mkdirSync(this.dir, { recursive: true });

    this.key = crypto.createHash('sha256').update(`${homeDirPath}${SALT}`).digest(); // 32-byte key
    this.iv = crypto.createHash('md5').update(homeDirPath).digest(); // 16-byte IV
  }

  public async login(baseUrl: string) {
    const deviceFlow = new RedoclyOAuthDeviceFlow(baseUrl);

    const credentials = await deviceFlow.run();
    if (!credentials) {
      throw new Error('Failed to login');
    }
    this.saveCredentials(credentials);
  }

  public async logout() {
    try {
      this.removeCredentials();
    } catch (err) {
      // do nothing
    }
  }

  public async isAuthorized(reuniteUrl: string, apiKey?: string): Promise<boolean> {
    if (apiKey) {
      const deviceFlow = new RedoclyOAuthDeviceFlow(reuniteUrl);
      return deviceFlow.verifyApiKey(apiKey);
    }

    const accessToken = await this.getAccessToken(reuniteUrl);

    return Boolean(accessToken);
  }

  public getAccessToken = async (reuniteUrl: string): Promise<string | null> => {
    const deviceFlow = new RedoclyOAuthDeviceFlow(reuniteUrl);
    const credentials = await this.readCredentials();

    if (!credentials) {
      return null;
    }

    const isValid = await deviceFlow.verifyToken(credentials.access_token);

    if (isValid) {
      return credentials.access_token;
    }

    try {
      const newCredentials = await deviceFlow.refreshToken(credentials.refresh_token);
      await this.saveCredentials(newCredentials);

      return newCredentials.access_token;
    } catch {
      return null;
    }
  };

  private get credentialsPath() {
    return path.join(this.dir, RedoclyOAuthClient.CREDENTIALS_FILE);
  }

  private async saveCredentials(credentials: Credentials): Promise<void> {
    try {
      const encryptedCredentials = this.encryptCredentials(credentials);
      writeFileSync(this.credentialsPath, encryptedCredentials, 'utf8');
    } catch (error) {
      logger.error(`Failed to save credentials: ${error.message}`);
    }
  }

  private async readCredentials(): Promise<Credentials | null> {
    if (!existsSync(this.credentialsPath)) {
      return null;
    }

    try {
      const encryptedCredentials = readFileSync(this.credentialsPath, 'utf8');
      return this.decryptCredentials(encryptedCredentials);
    } catch {
      return null;
    }
  }

  private async removeCredentials(): Promise<void> {
    if (existsSync(this.credentialsPath)) {
      rmSync(this.credentialsPath);
    }
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
