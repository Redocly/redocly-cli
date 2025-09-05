import { homedir } from 'node:os';
import path from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { logger } from '@redocly/openapi-core';
import { type AuthToken, RedoclyOAuthDeviceFlow } from './device-flow.js';

const SALT = '4618dbc9-8aed-4e27-aaf0-225f4603e5a4';
const CRYPTO_ALGORITHM = 'aes-256-cbc';

export class RedoclyOAuthClient {
  private static readonly TOKEN_FILE = 'credentials';
  private static readonly LEGACY_TOKEN_FILE = 'auth.json';

  private readonly dir: string;
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor() {
    const homeDirPath = homedir();

    this.dir = path.join(homeDirPath, '.redocly');
    mkdirSync(this.dir, { recursive: true });

    this.key = crypto.createHash('sha256').update(`${homeDirPath}${SALT}`).digest(); // 32-byte key
    this.iv = crypto.createHash('md5').update(homeDirPath).digest(); // 16-byte IV

    // TODO: Remove this after few months
    const legacyTokenPath = path.join(this.dir, RedoclyOAuthClient.LEGACY_TOKEN_FILE);

    if (existsSync(legacyTokenPath)) {
      rmSync(legacyTokenPath);
    }
  }

  public async login(baseUrl: string) {
    const deviceFlow = new RedoclyOAuthDeviceFlow(baseUrl);

    const token = await deviceFlow.run();
    if (!token) {
      throw new Error('Failed to login');
    }
    this.saveToken(token);
  }

  public async logout() {
    try {
      this.removeToken();
    } catch (err) {
      // do nothing
    }
  }

  public async isAuthorized(reuniteUrl: string, apiKey?: string): Promise<boolean> {
    if (apiKey) {
      const deviceFlow = new RedoclyOAuthDeviceFlow(reuniteUrl);
      return deviceFlow.verifyApiKey(apiKey);
    }

    const token = await this.getToken(reuniteUrl);

    return Boolean(token);
  }

  public getToken = async (reuniteUrl: string): Promise<AuthToken | null> => {
    const deviceFlow = new RedoclyOAuthDeviceFlow(reuniteUrl);
    const token = await this.readToken();

    if (!token) {
      return null;
    }

    const isValid = await deviceFlow.verifyToken(token.access_token);

    if (isValid) {
      return token;
    }

    try {
      const newToken = await deviceFlow.refreshToken(token.refresh_token);
      await this.saveToken(newToken);
      return newToken;
    } catch {
      await this.removeToken();
      return null;
    }
  };

  private get tokenPath() {
    return path.join(this.dir, RedoclyOAuthClient.TOKEN_FILE);
  }

  private async saveToken(token: AuthToken): Promise<void> {
    try {
      const encrypted = this.encryptToken(token);
      writeFileSync(this.tokenPath, encrypted, 'utf8');
    } catch (error) {
      logger.error(`Error saving tokens: ${error}`);
    }
  }

  private async readToken(): Promise<AuthToken | null> {
    if (!existsSync(this.tokenPath)) {
      return null;
    }

    try {
      const encrypted = readFileSync(this.tokenPath, 'utf8');
      return this.decryptToken(encrypted);
    } catch {
      return null;
    }
  }

  private async removeToken(): Promise<void> {
    if (existsSync(this.tokenPath)) {
      rmSync(this.tokenPath);
    }
  }

  private encryptToken(token: AuthToken): string {
    const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, this.key, this.iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(token), 'utf8'), cipher.final()]);

    return encrypted.toString('hex');
  }

  private decryptToken(encryptedToken: string): AuthToken {
    const decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, this.key, this.iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedToken, 'hex')),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }
}
