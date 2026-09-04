import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// This file is DELIBERATELY separate from spelling.test.ts (which exercises
// the real nspell/dictionary-en dev dependencies): every test here mocks
// module resolution for 'nspell'/'dictionary-en', and mixing that with
// tests that expect the REAL modules in the same file risks module-cache
// ordering flakiness. Nothing in this file ever imports the real nspell.
//
// `vi.doMock` (not the hoisted `vi.mock`) is the right tool here: every
// import this suite cares about is a runtime DYNAMIC `import('nspell')` /
// `import('dictionary-en')` (see spelling.ts's `loadSpeller` and
// validate.ts's peer-availability check) — never a static top-of-file
// import — so registering the mock at the START of each test (before the
// dynamic import executes) is sufficient; nothing needs hoisting.
// `vi.resetModules()` before AND after each test clears the module
// registry so a fresh `import('../validate.js')` always re-resolves
// 'nspell'/'dictionary-en' through the CURRENT mock (or lack of one),
// rather than reusing a cached real (or stale-mocked) module from a
// previous test.

async function freshValidate() {
  const mod = await import('../validate.js');
  return mod.validate;
}

function spellingConfig(spelling: Record<string, unknown> = {}) {
  return {
    'recheck/spelling-check': {
      severity: 'error' as const,
      message: 'Unknown word "%s"%s',
      assertions: { spelling },
    },
  };
}

function noSpellingConfig() {
  return {
    'recheck/pattern-check': {
      severity: 'error' as const,
      message: 'msg',
      assertions: { pattern: { tokens: ['foo'] } },
    },
  };
}

const tmpDirs: string[] = [];
async function makeTmpDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-spelling-peer-'));
  tmpDirs.push(dir);
  return dir;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(async () => {
  vi.doUnmock('nspell');
  vi.doUnmock('dictionary-en');
  vi.doUnmock('node:fs/promises');
  vi.resetModules();
  await Promise.all(tmpDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('spelling: lazy-load proof', () => {
  it('a config WITHOUT `spelling` never imports nspell or dictionary-en', async () => {
    const nspellFactory = vi.fn(() => {
      throw new Error('nspell must not be imported when no rule enables spelling');
    });
    const dictionaryEnFactory = vi.fn(() => {
      throw new Error('dictionary-en must not be imported when no rule enables spelling');
    });
    vi.doMock('nspell', nspellFactory);
    vi.doMock('dictionary-en', dictionaryEnFactory);

    const validate = await freshValidate();
    const result = await validate(noSpellingConfig());

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(nspellFactory).not.toHaveBeenCalled();
    expect(dictionaryEnFactory).not.toHaveBeenCalled();
  });

  it('runRules on a spelling-free rule set never imports nspell or dictionary-en', async () => {
    const nspellFactory = vi.fn(() => {
      throw new Error('nspell must not be imported when no rule enables spelling');
    });
    vi.doMock('nspell', nspellFactory);

    const { runRules } = await import('../../core/runner.js');
    const rule = {
      name: 'recheck/pattern-check',
      shortName: 'pattern-check',
      severity: 'error' as const,
      message: 'msg',
      assertions: { pattern: { tokens: ['foo'] } },
    };

    const { problems } = await runRules([{ path: 't.md', content: 'foo bar\n' }], [rule]);

    expect(problems).toHaveLength(1);
    expect(nspellFactory).not.toHaveBeenCalled();
  });
});

describe('spelling: MISSING-PEER validation', () => {
  it('reports an actionable "npm i nspell dictionary-en" error when nspell fails to import', async () => {
    vi.doMock('nspell', () => {
      throw new Error("Cannot find module 'nspell'");
    });

    const validate = await freshValidate();
    const result = await validate(spellingConfig());

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (error) =>
          error.message.includes('npm i nspell dictionary-en') && error.message.includes('spelling')
      )
    ).toBe(true);
    // Never a bare module-not-found bubbling up as the whole story.
    expect(result.errors.some((error) => /cannot find module/i.test(error.message))).toBe(false);
  });

  it('reports an actionable "npm i dictionary-en" install-command error when only dictionary-en fails to import', async () => {
    vi.doMock('dictionary-en', () => {
      throw new Error("Cannot find module 'dictionary-en'");
    });

    const validate = await freshValidate();
    const result = await validate(spellingConfig());

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) => error.message.includes('npm i nspell dictionary-en'))
    ).toBe(true);
  });

  it('when a custom `dictionary` path is set, the install command is just "npm i nspell" (dictionary-en is never attempted)', async () => {
    const dictionaryEnFactory = vi.fn(() => {
      throw new Error('dictionary-en must not be imported when a custom dictionary path is set');
    });
    vi.doMock('nspell', () => {
      throw new Error("Cannot find module 'nspell'");
    });
    vi.doMock('dictionary-en', dictionaryEnFactory);

    const validate = await freshValidate();
    const result = await validate(spellingConfig({ dictionary: '/tmp/some/custom' }));

    expect(result.isValid).toBe(false);
    const message = result.errors.find((error) => error.message.includes('nspell'))?.message ?? '';
    expect(message).toContain('npm i nspell');
    expect(message).not.toContain('dictionary-en');
    expect(dictionaryEnFactory).not.toHaveBeenCalled();
  });

  it('passes validation when both peers import successfully', async () => {
    vi.doMock('nspell', () => ({ default: () => ({ correct: () => true, suggest: () => [] }) }));
    vi.doMock('dictionary-en', () => ({
      default: { aff: new Uint8Array(), dic: new Uint8Array() },
    }));

    const validate = await freshValidate();
    const result = await validate(spellingConfig());

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // Item 14 (pre-PR cleanup): a config with SEVERAL spelling rules missing
  // the same peers used to report one identical peer-missing error per
  // rule — pure noise, since the fix (one install command) is the same for
  // all of them. Each DISTINCT message is reported exactly once; a mixed
  // config (default-dictionary rule + custom-dictionary rule) still gets
  // both distinct install commands.
  it('reports one deduped error when several spelling rules are missing the same peers', async () => {
    vi.doMock('nspell', () => {
      throw new Error("Cannot find module 'nspell'");
    });

    const validate = await freshValidate();
    const result = await validate({
      'recheck/spelling-one': {
        severity: 'error' as const,
        message: 'Unknown word "%s"%s',
        assertions: { spelling: {} },
      },
      'recheck/spelling-two': {
        severity: 'error' as const,
        message: 'Unknown word "%s"%s',
        assertions: { spelling: {} },
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('npm i nspell dictionary-en');
  });

  it('a mixed default-dictionary + custom-dictionary config still reports both distinct install commands', async () => {
    vi.doMock('nspell', () => {
      throw new Error("Cannot find module 'nspell'");
    });

    // The custom dictionary's files must actually EXIST here: this test is
    // about the peer-dependency install-command messages, not the (separate)
    // dictionary-file-existence check added alongside it -- a bogus,
    // nonexistent path would add a third, unrelated error and break the
    // `toHaveLength(2)` assertion below.
    const dictionaryEn = (await import('dictionary-en')).default;
    const dir = await makeTmpDir();
    const base = path.join(dir, 'custom');
    await fs.writeFile(`${base}.aff`, dictionaryEn.aff);
    await fs.writeFile(`${base}.dic`, dictionaryEn.dic);

    const validate = await freshValidate();
    const result = await validate({
      'recheck/spelling-default': {
        severity: 'error' as const,
        message: 'Unknown word "%s"%s',
        assertions: { spelling: {} },
      },
      'recheck/spelling-custom': {
        severity: 'error' as const,
        message: 'Unknown word "%s"%s',
        assertions: { spelling: { dictionary: base } },
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
    const messages = result.errors.map((error) => error.message);
    expect(messages.some((m) => m.includes('npm i nspell dictionary-en'))).toBe(true);
    expect(messages.some((m) => m.includes('npm i nspell') && !m.includes('dictionary-en'))).toBe(
      true
    );
  });

  // Bugbot finding, layer 2: the custom-dictionary install-command test above
  // deliberately keeps a bogus path (nspell itself is mocked missing there,
  // so the file-existence check is irrelevant to it); THIS describe block is
  // dedicated to the new file-existence check itself.
  describe('spelling: custom dictionary FILE-EXISTENCE validation', () => {
    it('reports an actionable error naming the resolved .aff/.dic paths when they do not exist', async () => {
      vi.doMock('nspell', () => ({ default: () => ({ correct: () => true, suggest: () => [] }) }));

      const dir = await makeTmpDir();
      const base = path.join(dir, 'missing-custom');

      const validate = await freshValidate();
      const result = await validate(spellingConfig({ dictionary: base }));

      expect(result.isValid).toBe(false);
      const messages = result.errors.map((error) => error.message).join('\n');
      expect(messages).toContain(`${base}.aff`);
      expect(messages).toContain(`${base}.dic`);
    });

    it('passes when the custom dictionary files exist and are readable', async () => {
      vi.doMock('nspell', () => ({ default: () => ({ correct: () => true, suggest: () => [] }) }));

      const dictionaryEn = (await import('dictionary-en')).default;
      const dir = await makeTmpDir();
      const base = path.join(dir, 'custom');
      await fs.writeFile(`${base}.aff`, dictionaryEn.aff);
      await fs.writeFile(`${base}.dic`, dictionaryEn.dic);

      const validate = await freshValidate();
      const result = await validate(spellingConfig({ dictionary: base }));

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});

// Item 15 (pre-PR cleanup): spelling.ts's module-level spellerCache must
// make repeated execute() calls with the SAME dictionary config reuse one
// speller instance. The observable is the `nspell(dictionary)` constructor
// call count — parsing the dictionary is the expensive "load" the cache
// exists to avoid (a module-registry import of 'dictionary-en' is cached by
// the runtime itself either way, so import counts can't distinguish a cache
// hit from a miss).
describe('spelling: speller cache reuse', () => {
  it('two execute() calls with the same dictionary config trigger exactly one dictionary load', async () => {
    const nspellConstructor = vi.fn(() => ({ correct: () => true, suggest: () => [] }));
    vi.doMock('nspell', () => ({ default: nspellConstructor }));
    vi.doMock('dictionary-en', () => ({
      default: { aff: new Uint8Array(), dic: new Uint8Array() },
    }));

    const { spelling } = await import('../../rules/scope/spelling.js');
    const { parseMarkdown } = await import('../../parser/index.js');
    const { extractScopes } = await import('../../scopes/extractor.js');

    const rule = {
      name: 'recheck/spelling-check',
      shortName: 'spelling-check',
      severity: 'error' as const,
      message: 'Unknown word "%s"%s',
      assertions: { spelling: {} },
    };
    const buildCtx = (content: string) => {
      const tree = parseMarkdown(content);
      const segments = extractScopes(tree, content).filter((s) => s.scope === 'paragraph');
      return { segments, content, tree };
    };

    await spelling.execute(rule, 'a.md', buildCtx('First document prose.\n'));
    await spelling.execute(rule, 'b.md', buildCtx('Second document prose.\n'));

    expect(nspellConstructor).toHaveBeenCalledTimes(1);
  });
});

// High-severity Bugbot finding: spellerCache stored the in-flight promise
// BEFORE it settled and never evicted it on rejection -- every later call
// for the same cache key replayed the same dead rejection forever, so
// spelling was silently disabled for the rest of the process after one
// failed load. A later call after the failure clears must retry fresh
// instead. Mocking 'node:fs/promises' itself (rather than a real tmp dir)
// lets this test flip failure on/off deterministically across two calls
// within the SAME test, without relying on real filesystem timing.
describe('spelling: cache eviction on rejected load', () => {
  it('evicts a rejected load so a later call with the same dictionary key attempts a fresh load instead of replaying the failure', async () => {
    let shouldFail = true;
    let readAttempts = 0;

    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof fs>('node:fs/promises');
      return {
        ...actual,
        // The dictionary path below is deliberately bogus (never a real
        // file on disk), so "success" here means resolving with SOME bytes
        // -- not delegating to the real readFile, which would still ENOENT.
        // nspell itself is mocked too, so the actual byte content is unused.
        readFile: vi.fn(() => {
          readAttempts += 1;
          if (shouldFail) return Promise.reject(new Error('simulated transient read failure'));
          return Promise.resolve(Buffer.from('dummy'));
        }),
      };
    });

    const nspellConstructor = vi.fn(() => ({ correct: () => true, suggest: () => [] }));
    vi.doMock('nspell', () => ({ default: nspellConstructor }));

    const { spelling } = await import('../../rules/scope/spelling.js');
    const { parseMarkdown } = await import('../../parser/index.js');
    const { extractScopes } = await import('../../scopes/extractor.js');

    const buildCtx = (content: string) => {
      const tree = parseMarkdown(content);
      const segments = extractScopes(tree, content).filter((s) => s.scope === 'paragraph');
      return { segments, content, tree };
    };

    const rule = {
      name: 'recheck/spelling-check',
      shortName: 'spelling-check',
      severity: 'error' as const,
      message: 'Unknown word "%s"%s',
      assertions: { spelling: { dictionary: '/tmp/does-not-matter/custom' } },
    };

    // First load: the (mocked) custom dictionary read fails -> execute()
    // must surface the failure (rethrow) rather than caching a resolved [].
    await expect(
      spelling.execute(rule, 'a.md', buildCtx('First document prose.\n'))
    ).rejects.toThrow();
    const attemptsAfterFirstFailure = readAttempts;
    expect(attemptsAfterFirstFailure).toBeGreaterThan(0);

    // The failure clears; a SECOND call with the IDENTICAL dictionary key
    // must attempt a fresh load (more readFile calls), not reuse the cached
    // rejected promise, and must succeed.
    shouldFail = false;
    const problems = await spelling.execute(rule, 'b.md', buildCtx('Second document prose.\n'));

    expect(readAttempts).toBeGreaterThan(attemptsAfterFirstFailure);
    expect(problems).toEqual([]); // the nspell mock reports everything 'correct'
    expect(nspellConstructor).toHaveBeenCalledTimes(1); // only the successful load builds a speller
  });
});
