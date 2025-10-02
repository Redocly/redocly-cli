import { homedir } from 'node:os';
import path from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { logger } from '@redocly/openapi-core';
import { type Credentials, RedoclyOAuthDeviceFlow } from './device-flow.js';
import { isValidReuniteUrl } from '../reunite/api/domains.js';

const CREDENTIALS_SALT = '4618dbc9-8aed-4e27-aaf0-225f4603e5a4';
const CRYPTO_ALGORITHM = 'aes-256-cbc';

export class RedoclyOAuthClient {
  public readonly credentialsFolderPath: string;
  public readonly credentialsFilePath: string;
  public readonly credentialsFileName: string;

  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor() {
    const homeDirPath = homedir();

    this.credentialsFolderPath = path.join(homeDirPath, '.redocly');
    this.credentialsFileName = 'credentials';
    this.credentialsFilePath = path.join(this.credentialsFolderPath, this.credentialsFileName);

    this.key = crypto.createHash('sha256').update(`${homeDirPath}${CREDENTIALS_SALT}`).digest();
    this.iv = crypto.createHash('md5').update(homeDirPath).digest();

    mkdirSync(this.credentialsFolderPath, { recursive: true });
  }

  public async login(baseUrl: string): Promise<void> {
    const deviceFlow = new RedoclyOAuthDeviceFlow(baseUrl);

    const credentials = await deviceFlow.run();
    if (!credentials) {
      throw new Error('Failed to login. No credentials received.');
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

    if (
      !credentials ||
      !isValidReuniteUrl(reuniteUrl) ||
      (credentials.residency && credentials.residency !== reuniteUrl)
    ) {
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

  private async saveCredentials(credentials: Credentials): Promise<void> {
    try {
      const encryptedCredentials = this.encryptCredentials(credentials);
      writeFileSync(this.credentialsFilePath, encryptedCredentials, 'utf8');
    } catch (error) {
      logger.error(`Failed to save credentials: ${error.message}`);
    }
  }

  private async readCredentials(): Promise<Credentials | null> {
    if (!existsSync(this.credentialsFilePath)) {
      return null;
    }

    try {
      const encryptedCredentials = readFileSync(this.credentialsFilePath, 'utf8');
      return this.decryptCredentials(encryptedCredentials);
    } catch {
      return null;
    }
  }

  private async removeCredentials(): Promise<void> {
    if (existsSync(this.credentialsFilePath)) {
      rmSync(this.credentialsFilePath);
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
