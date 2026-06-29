import type { Entry } from 'har-format';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { appendFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';

/**
 * Captures exchanges as HAR 1.2 entries without retaining them in memory: each
 * entry is appended as a single line to a temporary NDJSON file. On `finalize`
 * that file is streamed into the final HAR document (wrapping the entries with
 * the remaining HAR fields) and removed. Appends are serialized through a promise
 * chain so concurrent captures never interleave file writes.
 */
export class HarWriter {
  private readonly outputPath: string;
  private readonly entriesPath: string;
  private readonly creatorVersion: string;
  private writeChain: Promise<void> = Promise.resolve();
  private directoryEnsured = false;
  private started = false;
  private count = 0;

  constructor(outputPath: string, creatorVersion: string) {
    this.outputPath = path.resolve(process.cwd(), outputPath);
    this.entriesPath = `${this.outputPath}.entries.tmp`;
    this.creatorVersion = creatorVersion;
  }

  get entryCount(): number {
    return this.count;
  }

  add(entry: Entry): Promise<void> {
    this.count += 1;
    const line = `${JSON.stringify(entry)}\n`;
    this.writeChain = this.writeChain.catch(() => undefined).then(() => this.append(line));
    return this.writeChain;
  }

  async finalize(): Promise<void> {
    await this.writeChain.catch(() => undefined);
    await this.ensureDirectory();
    await this.writeDocument();
    await rm(this.entriesPath, { force: true });
  }

  private async append(line: string): Promise<void> {
    await this.ensureDirectory();
    if (!this.started) {
      await writeFile(this.entriesPath, line, 'utf8');
      this.started = true;
      return;
    }
    await appendFile(this.entriesPath, line, 'utf8');
  }

  private async ensureDirectory(): Promise<void> {
    if (this.directoryEnsured) {
      return;
    }
    await mkdir(path.dirname(this.outputPath), { recursive: true });
    this.directoryEnsured = true;
  }

  private async writeDocument(): Promise<void> {
    const stream = createWriteStream(this.outputPath, { encoding: 'utf8' });
    const write = (chunk: string): Promise<void> =>
      new Promise((resolve, reject) => {
        stream.write(chunk, (error) => (error ? reject(error) : resolve()));
      });

    try {
      const creator = JSON.stringify({ name: 'redocly-cli proxy', version: this.creatorVersion });
      await write(
        `{\n  "log": {\n    "version": "1.2",\n    "creator": ${creator},\n    "entries": [`
      );

      let written = 0;
      if (existsSync(this.entriesPath)) {
        const lines = createInterface({
          input: createReadStream(this.entriesPath, { encoding: 'utf8' }),
          crlfDelay: Infinity,
        });
        for await (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          await write(`${written === 0 ? '\n' : ',\n'}      ${line}`);
          written += 1;
        }
      }

      await write(written === 0 ? ']\n  }\n}\n' : '\n    ]\n  }\n}\n');
    } finally {
      await new Promise<void>((resolve, reject) => {
        stream.on('error', reject);
        stream.end(() => resolve());
      });
    }
  }
}
