import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// These tests mock `nspell` and `dictionary-en`, so they are separate from spelling.test.ts, which
// uses the real packages. `vi.doMock` is enough because the code loads both with a dynamic
// `import()`. `vi.resetModules()` makes each test import them again through the current mock.

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

  // Several spelling rules that miss the same peers report each distinct message once. A mixed
  // config (default and custom dictionary) still gets both install commands.
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

    // The custom dictionary files must exist, or the file check would add a third error.
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

  // The test above uses a bogus path because the mocked nspell never reads it. These tests cover
  // the file check itself.
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

// The speller is cached, so repeated `execute()` calls with the same dictionary config build one
// speller. The test counts calls to the `nspell(dictionary)` constructor, because the runtime
// caches the `dictionary-en` import itself and import counts cannot show a cache hit.
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

// A failed dictionary load must not stay in the cache. A later call retries the load. The test
// mocks 'node:fs/promises' so the read can fail on the first call and work on the second.
describe('spelling: cache eviction on rejected load', () => {
  it('evicts a rejected load so a later call with the same dictionary key attempts a fresh load instead of replaying the failure', async () => {
    let shouldFail = true;
    let readAttempts = 0;

    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof fs>('node:fs/promises');
      return {
        ...actual,
        // The dictionary path is not a real file, so a successful read has to return some bytes.
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

    // First load: the read fails, so `execute()` must throw and not cache an empty result.
    await expect(
      spelling.execute(rule, 'a.md', buildCtx('First document prose.\n'))
    ).rejects.toThrow();
    const attemptsAfterFirstFailure = readAttempts;
    expect(attemptsAfterFirstFailure).toBeGreaterThan(0);

    // The failure is gone: the second call with the same dictionary must load again and succeed.
    shouldFail = false;
    const problems = await spelling.execute(rule, 'b.md', buildCtx('Second document prose.\n'));

    expect(readAttempts).toBeGreaterThan(attemptsAfterFirstFailure);
    expect(problems).toEqual([]);
    expect(nspellConstructor).toHaveBeenCalledTimes(1);
  });
});
