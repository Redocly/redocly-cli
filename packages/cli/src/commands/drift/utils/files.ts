import { open, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const SPEC_FILE_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);

export async function listOpenApiFiles(rootDir: string): Promise<string[]> {
  const output: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile() && SPEC_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        output.push(absolutePath);
      }
    }
  }

  await walk(rootDir);
  output.sort();
  return output;
}

export async function readProbe(filePath: string, maxBytes = 4096): Promise<string> {
  const fileHandle = await open(filePath, 'r');
  try {
    const buffer = Buffer.allocUnsafe(maxBytes);
    const { bytesRead } = await fileHandle.read(buffer, 0, maxBytes, 0);
    return buffer.toString('utf8', 0, bytesRead);
  } finally {
    await fileHandle.close();
  }
}

export function normalizeFsPath(value: string): string {
  return path.resolve(process.cwd(), value);
}

export async function listFilesRecursively(rootPath: string): Promise<string[]> {
  const stats = await stat(rootPath);
  if (stats.isFile()) {
    return [rootPath];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  const output: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        output.push(absolutePath);
      }
    }
  }

  await walk(rootPath);
  output.sort();
  return output;
}
