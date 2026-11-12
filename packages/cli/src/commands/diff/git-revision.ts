import {
  BaseResolver,
  HandledError,
  isAbsoluteUrl,
  ResolveError,
  Source,
} from '@redocly/openapi-core';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Tells whether a ref names a file in a git revision, written as `git show` takes it:
 * `<revision>:<path>`. A file that exists under that very name is not one.
 */
export function isGitRevisionFile(ref: string): boolean {
  const { revision, filePath } = splitRevisionFile(ref);

  return (
    revision !== '' &&
    // A revision that starts with a dash would reach git as an option.
    !revision.startsWith('-') &&
    filePath !== '' &&
    !isAbsoluteUrl(ref) &&
    !path.isAbsolute(ref) &&
    !existsSync(ref)
  );
}

/**
 * Returns the git revision file with its path counted from the repository root. Git counts
 * a path that starts with `./` or `../` from the current directory.
 */
export async function fromRepositoryRoot(file: string): Promise<string> {
  const { revision, filePath } = splitRevisionFile(file);
  if (!filePath.startsWith('./') && !filePath.startsWith('../')) return file;

  const currentDirectory = (await runGit(['rev-parse', '--show-prefix'])).trim();
  const fromRoot = path.posix.join(currentDirectory, filePath);
  if (fromRoot.startsWith('../')) {
    throw new HandledError(`${file} is outside the git repository.`);
  }

  return `${revision}:${fromRoot}`;
}

/**
 * Loads a git revision file from git, and the files it references from the same revision.
 * Every other ref loads as `BaseResolver` loads it.
 */
export class GitRevisionResolver extends BaseResolver {
  // Only the document to load and the `$ref`s of a revision file name revision files,
  // so a document from a URL or from the working tree cannot read from git.
  private revisionFiles = new Set<string>();

  resolveExternalRef(base: string | null, ref: string): string {
    const isInRevision = base === null ? isGitRevisionFile(ref) : this.revisionFiles.has(base);
    if (!isInRevision || isAbsoluteUrl(ref)) return super.resolveExternalRef(base, ref);

    const revisionFile = base === null ? ref : resolveInRevision(base, ref);
    this.revisionFiles.add(revisionFile);

    return revisionFile;
  }

  async loadExternalRef(absoluteRef: string): Promise<Source> {
    if (!this.revisionFiles.has(absoluteRef)) return super.loadExternalRef(absoluteRef);

    try {
      const body = await runGit(['show', absoluteRef]);
      return new Source(absoluteRef, body.replace(/\r\n/g, '\n'));
    } catch (error) {
      throw new ResolveError(error);
    }
  }
}

function resolveInRevision(base: string, ref: string): string {
  const { revision, filePath } = splitRevisionFile(base);
  // As in a URL, a path cannot go above the root, so a revision file reads only its revision.
  const fromRoot = path.posix.resolve('/', path.posix.dirname(filePath), ref).slice(1);

  return `${revision}:${fromRoot}`;
}

function splitRevisionFile(file: string): { revision: string; filePath: string } {
  const [revision, ...pathParts] = file.split(':');

  return { revision, filePath: pathParts.join(':') };
}

async function runGit(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, { maxBuffer: Infinity });

    return stdout;
  } catch (error) {
    throw new HandledError(
      error.code === 'ENOENT'
        ? 'git is not installed or not on PATH.'
        : (error.stderr || error.message).trim()
    );
  }
}
