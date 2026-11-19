import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { FileCredentialsStore } from '../credentials-store.js';

describe('FileCredentialsStore', () => {
  let tempDir: string;
  let store: FileCredentialsStore;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'credentials-store-'));
    store = new FileCredentialsStore(path.join(tempDir, '.redocly', 'credentials'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads a missing credentials file as no credentials', async () => {
    await expect(store.read()).resolves.toBeNull();
  });

  it('writes, reads, and deletes the credentials', async () => {
    await store.write('encrypted');
    await expect(store.read()).resolves.toBe('encrypted');

    await store.delete();
    await expect(store.read()).resolves.toBeNull();
  });
});
