import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { loadImageMetadata, MAX_IMAGE_REFS_PER_FILE } from '../files.js';

describe('loadImageMetadata — root confinement', () => {
  let tempDir: string; // holds root/ plus files deliberately OUTSIDE root
  let root: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-image-meta-'));
    root = path.join(tempDir, 'root');
    await fs.mkdir(path.join(root, 'docs'), { recursive: true });
    await fs.mkdir(path.join(root, 'shared'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('stats in-root images, including ../ refs that stay inside the root', async () => {
    await fs.writeFile(path.join(root, 'docs', 'local.png'), Buffer.alloc(2048, 0));
    await fs.writeFile(path.join(root, 'shared', 'img.png'), Buffer.alloc(512, 0));

    const doc = path.join(root, 'docs', 'doc.md');
    const content = '![local](./local.png)\n\n![shared](../shared/img.png)\n';
    const metadata = await loadImageMetadata(doc, content, root);

    expect(metadata?.images?.get('./local.png')).toMatchObject({ exists: true, size: 2048 });
    expect(metadata?.images?.get('../shared/img.png')).toMatchObject({ exists: true, size: 512 });
  });

  it('records ../ traversal refs escaping the root as exists:false without stat-ing them', async () => {
    // The escape target EXISTS on disk (sibling of root): the old
    // unconfined behavior stat'ed it and reported exists:true/size —
    // an existence/size disclosure for anything reachable from the doc
    // (e.g. ../../../../etc/passwd). Confined, it must read as missing.
    await fs.writeFile(path.join(tempDir, 'outside.png'), Buffer.alloc(4096, 0));

    const doc = path.join(root, 'docs', 'doc.md');
    const content =
      '![escape](../../outside.png)\n\n![passwd](../../../../../../../../etc/passwd)\n';
    const metadata = await loadImageMetadata(doc, content, root);

    expect(metadata?.images?.get('../../outside.png')).toEqual({
      path: '../../outside.png',
      size: 0,
      exists: false,
    });
    expect(metadata?.images?.get('../../../../../../../../etc/passwd')).toEqual({
      path: '../../../../../../../../etc/passwd',
      size: 0,
      exists: false,
    });
  });

  it('records absolute-path refs (filesystem or site-absolute) as exists:false without stat-ing', async () => {
    const doc = path.join(root, 'docs', 'doc.md');
    // /etc/passwd exists on disk; /images/foo.png is a typical
    // site-absolute doc ref. Both resolve outside the root and must be
    // treated as missing (which is also what the old code effectively did
    // for site-absolute refs — the stat against the filesystem root
    // failed — so real-corpus findings don't change).
    const content = '![p](/etc/passwd)\n\n![site](/images/foo.png)\n';
    const metadata = await loadImageMetadata(doc, content, root);

    expect(metadata?.images?.get('/etc/passwd')).toEqual({
      path: '/etc/passwd',
      size: 0,
      exists: false,
    });
    expect(metadata?.images?.get('/images/foo.png')).toEqual({
      path: '/images/foo.png',
      size: 0,
      exists: false,
    });
  });

  it('defaults the root to process.cwd()', async () => {
    // A ref escaping the current working directory is confined even when
    // no explicit root is passed.
    const doc = path.join(root, 'docs', 'doc.md');
    const content = '![passwd](/etc/passwd)\n';
    const metadata = await loadImageMetadata(doc, content);

    expect(metadata?.images?.get('/etc/passwd')).toEqual({
      path: '/etc/passwd',
      size: 0,
      exists: false,
    });
  });
});

describe('loadImageMetadata — symlink-aware root confinement', () => {
  let tempDir: string; // holds root/ plus files deliberately OUTSIDE root
  let root: string;

  // Symlink creation needs privileges on Windows (Developer Mode or
  // SeCreateSymbolicLinkPrivilege), so these scenarios can't be set up
  // there — skip rather than silently assert the wrong thing (same
  // pattern as the unreadable-file skip in commands/__tests__/run.test.ts).
  const symlinksUnavailable = process.platform === 'win32';

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-image-symlink-'));
    root = path.join(tempDir, 'root');
    await fs.mkdir(path.join(root, 'docs'), { recursive: true });
    await fs.mkdir(path.join(root, 'shared'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it.skipIf(symlinksUnavailable)(
    'records an in-root symlink that resolves OUTSIDE the root as exists:false without leaking the target',
    async () => {
      // The link itself sits INSIDE the root, so the lexical check passes;
      // its target (/etc/hosts — present and readable on the POSIX
      // platforms this test runs on) is outside. Before the physical
      // check, fs.stat followed the link and leaked the real target's
      // existence and size into lint output.
      await fs.symlink('/etc/hosts', path.join(root, 'docs', 'evil.png'));

      const doc = path.join(root, 'docs', 'doc.md');
      const metadata = await loadImageMetadata(doc, '![evil](./evil.png)\n', root);

      expect(metadata?.images?.get('./evil.png')).toEqual({
        path: './evil.png',
        size: 0,
        exists: false,
      });
    }
  );

  it.skipIf(symlinksUnavailable)(
    'confines refs that traverse an in-root directory symlink escaping the root',
    async () => {
      // Directory variant of the same bypass: root/docs/assets -> tempDir,
      // so ./assets/outside.png lexically stays inside the root but
      // physically lands on a sibling of it.
      await fs.writeFile(path.join(tempDir, 'outside.png'), Buffer.alloc(4096, 0));
      await fs.symlink(tempDir, path.join(root, 'docs', 'assets'));

      const doc = path.join(root, 'docs', 'doc.md');
      const metadata = await loadImageMetadata(doc, '![out](./assets/outside.png)\n', root);

      expect(metadata?.images?.get('./assets/outside.png')).toEqual({
        path: './assets/outside.png',
        size: 0,
        exists: false,
      });
    }
  );

  it.skipIf(symlinksUnavailable)(
    'keeps allowing symlinks inside the root that also RESOLVE inside the root',
    async () => {
      // Legit repo layouts symlink shared asset dirs/files around inside
      // the checkout — those must keep stat-ing normally.
      await fs.writeFile(path.join(root, 'shared', 'real.png'), Buffer.alloc(1024, 0));
      await fs.symlink(
        path.join('..', 'shared', 'real.png'),
        path.join(root, 'docs', 'link-in.png')
      );

      const doc = path.join(root, 'docs', 'doc.md');
      const metadata = await loadImageMetadata(doc, '![in](./link-in.png)\n', root);

      expect(metadata?.images?.get('./link-in.png')).toEqual({
        path: './link-in.png',
        size: 1024,
        exists: true,
      });
    }
  );

  it.skipIf(symlinksUnavailable)(
    'reports a dangling in-root symlink as exists:false, like any missing file',
    async () => {
      // fs.realpath throws ENOENT here; the missing-file path must stay
      // exactly as strong as before — exists:false, no error escaping.
      await fs.symlink(
        path.join(root, 'shared', 'gone.png'),
        path.join(root, 'docs', 'dangling.png')
      );

      const doc = path.join(root, 'docs', 'doc.md');
      const metadata = await loadImageMetadata(doc, '![gone](./dangling.png)\n', root);

      expect(metadata?.images?.get('./dangling.png')).toEqual({
        path: './dangling.png',
        size: 0,
        exists: false,
      });
    }
  );
});

describe('loadImageMetadata — per-file ref cap', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-image-cap-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it(`processes at most ${MAX_IMAGE_REFS_PER_FILE} unique refs and omits the overflow from the map`, async () => {
    const total = MAX_IMAGE_REFS_PER_FILE + 5;
    const lines: string[] = [];
    for (let i = 0; i < total; i++) lines.push(`![i${i}](./img-${i}.png)`, '');
    const doc = path.join(root, 'doc.md');
    const metadata = await loadImageMetadata(doc, lines.join('\n'), root);

    expect(metadata?.images?.size).toBe(MAX_IMAGE_REFS_PER_FILE);
    // Within the cap: recorded (missing on disk here, so exists:false).
    expect(metadata?.images?.get('./img-0.png')).toMatchObject({ exists: false });
    // Beyond the cap: ABSENT — not falsely recorded as exists:false.
    // max-image-size treats a missing map entry as "no metadata, skip",
    // identical to its exists:false handling, so omission never fabricates
    // a "missing image" fact for a ref that was simply never checked.
    expect(metadata?.images?.has(`./img-${MAX_IMAGE_REFS_PER_FILE}.png`)).toBe(false);
    expect(metadata?.images?.has(`./img-${total - 1}.png`)).toBe(false);
  });

  it('duplicate refs share one map entry and do not consume cap slots', async () => {
    await fs.writeFile(path.join(root, 'img.png'), Buffer.alloc(256, 0));
    const doc = path.join(root, 'doc.md');
    const content = '![a](./img.png)\n\n![b](./img.png)\n\n![c](./other.png)\n';
    const metadata = await loadImageMetadata(doc, content, root);

    expect(metadata?.images?.size).toBe(2);
    expect(metadata?.images?.get('./img.png')).toMatchObject({ exists: true, size: 256 });
    expect(metadata?.images?.get('./other.png')).toMatchObject({ exists: false });
  });
});
