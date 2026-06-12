import type { Entry, Har } from 'har-format';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Accumulates captured exchanges as HAR 1.2 entries and persists them to disk.
 * Writes are rewritten in full after every entry (the whole document is a single
 * JSON object) and serialized through a promise chain so concurrent captures
 * never interleave file writes.
 */
export class HarWriter {
  private readonly entries: Entry[] = [];
  private readonly outputPath: string;
  private readonly creatorVersion: string;
  private writeChain: Promise<void> = Promise.resolve();
  private directoryEnsured = false;

  constructor(outputPath: string, creatorVersion: string) {
    this.outputPath = path.resolve(process.cwd(), outputPath);
    this.creatorVersion = creatorVersion;
  }

  get entryCount(): number {
    return this.entries.length;
  }

  add(entry: Entry): Promise<void> {
    this.entries.push(entry);
    return this.flush();
  }

  flush(): Promise<void> {
    this.writeChain = this.writeChain.catch(() => undefined).then(() => this.persist());
    return this.writeChain;
  }

  private async persist(): Promise<void> {
    if (!this.directoryEnsured) {
      await mkdir(path.dirname(this.outputPath), { recursive: true });
      this.directoryEnsured = true;
    }

    const document: Har = {
      log: {
        version: '1.2',
        creator: { name: 'redocly-cli proxy', version: this.creatorVersion },
        entries: this.entries,
      },
    };

    await writeFile(this.outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  }
}
