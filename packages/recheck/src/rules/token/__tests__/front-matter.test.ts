import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runRules } from '../../../core/runner.js';
import type { NormalizedRule } from '../../../types/index.js';

const CHANGESET_SCHEMA = {
  type: 'object',
  patternProperties: { '^@redocly/': { enum: ['major', 'minor', 'patch'] } },
  additionalProperties: false,
};

function rule(options: Record<string, unknown>): NormalizedRule {
  return {
    name: 'recheck/front-matter',
    shortName: 'front-matter',
    severity: 'error',
    message: 'Front matter: %s',
    assertions: { 'front-matter': options },
  };
}

const changesetRule = rule({ schemas: [{ files: ['.changeset/**'], schema: CHANGESET_SCHEMA }] });

async function lint(path: string, content: string, theRule: NormalizedRule = changesetRule) {
  const { problems } = await runRules([{ path, content }], [theRule], {});
  return problems;
}

describe('front-matter assertion', () => {
  it('passes front matter that matches the schema', async () => {
    const md = "---\n'@redocly/recheck': minor\n---\n\nBody.\n";
    expect(await lint('.changeset/two-cats-dance.md', md)).toEqual([]);
  });

  it('flags a wrong enum value at the offending line', async () => {
    const md = "---\n'@redocly/recheck': huge\n---\n\nBody.\n";
    const problems = await lint('.changeset/two-cats-dance.md', md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    expect(problems[0].message).toContain('@redocly/recheck');
  });

  it('flags an unknown key when additionalProperties is false', async () => {
    const md = "---\n'@redocly/recheck': minor\nmood: excellent\n---\n\nBody.\n";
    const problems = await lint('.changeset/two-cats-dance.md', md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
  });

  it('flags a missing required property at the block start', async () => {
    const strict = rule({
      schemas: [
        {
          files: ['docs/**'],
          schema: { type: 'object', required: ['description'], properties: {} },
        },
      ],
    });
    const problems = await lint('docs/page.md', '---\ntitle: X\n---\n\nBody.\n', strict);
    expect(problems.some((p) => p.message.includes('description') && p.line === 1)).toBe(true);
  });

  it('validates a file with no front matter as an empty object', async () => {
    const strict = rule({
      schemas: [{ files: ['docs/**'], schema: { type: 'object', required: ['description'] } }],
    });
    expect(await lint('docs/page.md', '# No front matter here\n', strict)).toHaveLength(1);
    const lax = rule({ schemas: [{ files: ['docs/**'], schema: { type: 'object' } }] });
    expect(await lint('docs/page.md', '# No front matter here\n', lax)).toEqual([]);
  });

  it('does not check a file that matches no mapping', async () => {
    const md = '---\nanything: goes\n---\n\nBody.\n';
    expect(await lint('README.md', md)).toEqual([]);
  });

  it('the first matching mapping wins', async () => {
    const ordered = rule({
      schemas: [
        { files: ['docs/special/**'], schema: { type: 'object', required: ['owner'] } },
        { files: ['docs/**'], schema: { type: 'object' } },
      ],
    });
    expect(await lint('docs/special/page.md', '---\ntitle: X\n---\n', ordered)).toHaveLength(1);
    expect(await lint('docs/other/page.md', '---\ntitle: X\n---\n', ordered)).toEqual([]);
  });

  describe('built-in realm schema', () => {
    const realmRule = rule({ schemas: [{ files: ['docs/**'], schema: 'realm' }] });
    const strictRealmRule = rule({
      schemas: [{ files: ['docs/**'], schema: 'realm', strict: true }],
    });

    it('accepts documented Realm front matter', async () => {
      const md =
        '---\nexcludeFromSearch: true\nslug: /custom/page\nseo:\n  title: A page\n---\n\nBody.\n';
      expect(await lint('docs/realm/page.md', md, realmRule)).toEqual([]);
    });

    it('accepts a slug list as well as a single slug', async () => {
      const md = '---\nslug:\n  - /one\n  - /two\n---\n\nBody.\n';
      expect(await lint('docs/realm/page.md', md, realmRule)).toEqual([]);
    });

    it('flags a known key with the wrong type', async () => {
      const md = "---\nexcludeFromSearch: 'true'\n---\n\nBody.\n";
      const problems = await lint('docs/realm/page.md', md, realmRule);
      expect(problems).toHaveLength(1);
      expect(problems[0].line).toBe(2);
      expect(problems[0].message).toContain('excludeFromSearch');
    });

    it('allows project-specific keys by default', async () => {
      // Redocly's own docs carry `products`/`plans` and read them back
      // through `$frontmatter` in Markdoc templates.
      const md = '---\nproducts:\n  - realm\nplans:\n  - enterprise\n---\n\nBody.\n';
      expect(await lint('docs/realm/page.md', md, realmRule)).toEqual([]);
    });

    it('flags an unknown key under strict', async () => {
      const md = '---\nexcludeFromsearch: true\n---\n\nBody.\n';
      const problems = await lint('docs/realm/page.md', md, strictRealmRule);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('excludeFromsearch');
    });

    it('still accepts documented front matter under strict', async () => {
      const md = '---\ntemplate: ./custom\nrbac:\n  Developers: read\n---\n\nBody.\n';
      expect(await lint('docs/realm/page.md', md, strictRealmRule)).toEqual([]);
    });

    it('flags sidebar: false, which Realm ignores rather than honors', async () => {
      const md = '---\nsidebar: false\n---\n\nBody.\n';
      const problems = await lint('docs/realm/page.md', md, realmRule);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('sidebar');
    });

    it('fails at the rule severity for an unknown built-in name', async () => {
      const bogus = rule({ schemas: [{ files: ['docs/**'], schema: 'realmm' }] });
      const problems = await lint('docs/realm/page.md', '---\ntitle: X\n---\n', bogus);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('unknown built-in schema');
    });
  });

  it('flags front matter that is not valid YAML at the block start', async () => {
    const md = '---\ntitle: [unclosed\n---\n\nBody.\n';
    const problems = await lint(
      'docs/page.md',
      md,
      rule({ schemas: [{ files: ['docs/**'], schema: { type: 'object' } }] })
    );
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('YAML');
  });

  it('loads a schema from schemaFile', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'recheck-fm-'));
    const schemaPath = join(dir, 'schema.yaml');
    writeFileSync(schemaPath, 'type: object\nrequired: [title]\n');
    const fileRule = rule({ schemas: [{ files: ['docs/**'], schemaFile: schemaPath }] });
    expect(await lint('docs/page.md', '---\ntitle: X\n---\n', fileRule)).toEqual([]);
    expect(await lint('docs/page.md', '---\nother: X\n---\n', fileRule)).toHaveLength(1);
  });

  it('a missing schemaFile fails at the rule severity, not as an internal warning', async () => {
    const fileRule = rule({
      schemas: [{ files: ['docs/**'], schemaFile: '/no/such/schema.yaml' }],
    });
    const problems = await lint('docs/page.md', '---\ntitle: X\n---\n', fileRule);
    expect(problems).toHaveLength(1);
    expect(problems[0].ruleName).toBe('recheck/front-matter');
    expect(problems[0].severity).toBe('error');
    expect(problems[0].message).toMatch(/schema/i);
  });

  it('YAML dates validate as strings, and format keywords are enforced', async () => {
    const dated = rule({
      schemas: [
        {
          files: ['docs/**'],
          schema: {
            type: 'object',
            properties: { date: { type: 'string', format: 'date' } },
          },
        },
      ],
    });
    expect(await lint('docs/page.md', '---\ndate: 2026-08-19\n---\n', dated)).toEqual([]);
    const problems = await lint('docs/page.md', '---\ndate: not-a-date\n---\n', dated);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
  });

  it('maps a nested error path to its top-level key line', async () => {
    const nested = rule({
      schemas: [
        {
          files: ['docs/**'],
          schema: {
            type: 'object',
            properties: { plans: { type: 'array', items: { type: 'string' } } },
          },
        },
      ],
    });
    const md = '---\ntitle: X\nplans:\n  - Pro\n  - 7\n---\n';
    const problems = await lint('docs/page.md', md, nested);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
  });
});
