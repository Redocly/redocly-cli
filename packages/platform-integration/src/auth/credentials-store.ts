import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Keeps the encrypted credentials string of `RedoclyOAuthClient`.
export interface CredentialsStore {
  // Resolves to `null` when no credentials are stored.
  read(): Promise<string | null>;
  write(credentials: string): Promise<void>;
  delete(): Promise<void>;
}

export class FileCredentialsStore implements CredentialsStore {
  constructor(public readonly filePath: string) {}

  public async read(): Promise<string | null> {
    try {
      return readFileSync(this.filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  public async write(credentials: string): Promise<void> {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, credentials, 'utf8');
  }

  public async delete(): Promise<void> {
    rmSync(this.filePath, { force: true });
  }
}
