import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outdent } from 'outdent';

import { handleEjectGenerator, threeWayMerge, wireConfig } from '../../commands/eject-generator.js';
import { ejectGeneratorTelemetry } from '../../utils/client-generator-telemetry.js';
import type { CommandArgs } from '../../wrapper.js';

const baseArgs = { version: '0.0.0', config: undefined } as unknown as Omit<
  CommandArgs<Record<string, unknown>>,
  'argv'
>;

function reset() {
  for (const key of Object.keys(ejectGeneratorTelemetry)) {
    delete ejectGeneratorTelemetry[key as keyof typeof ejectGeneratorTelemetry];
  }
}

describe('wireConfig', () => {
  const wire = (source: string): string => {
    const dir = mkdtempSync(join(tmpdir(), 'redocly-wire-config-'));
    const configPath = join(dir, 'redocly.yaml');
    writeFileSync(configPath, source, 'utf-8');
    try {
      expect(wireConfig(configPath, 'php', './generators/php.mjs')).toBe(true);
      return readFileSync(configPath, 'utf-8');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it('replaces a bare built-in name so the next run has no name collision', () => {
    expect(
      wire(outdent`
        client:
          generators:
            - php
            - typescript
      `)
    ).toBe(outdent`
      client:
        generators:
          - ./generators/php.mjs
          - typescript
    `);
    expect(wire('client:\n  generators: [php, typescript]\n')).toBe(
      'client:\n  generators: [./generators/php.mjs, typescript]\n'
    );
  });

  it('appends when the built-in name is not listed', () => {
    expect(
      wire(outdent`
        client:
          generators:
            - typescript
      `)
    ).toBe(outdent`
      client:
        generators:
          - typescript
          - ./generators/php.mjs
    `);
  });

  it('inserts the generators list when the client block has none', () => {
    expect(
      wire(outdent`
        client:
          runtime: package
        apis:
          cafe:
            root: ./openapi.yaml
      `)
    ).toBe(outdent`
      client:
        generators:
          - ./generators/php.mjs
        runtime: package
      apis:
        cafe:
          root: ./openapi.yaml
    `);
  });

  it('wires despite a comment that mentions the path, and is idempotent once listed', () => {
    // A mention outside the list (a comment, a longer path) is not wiring.
    expect(
      wire(outdent`
        # was: ./generators/php.mjs
        client:
          generators:
            - typescript
      `)
    ).toBe(outdent`
      # was: ./generators/php.mjs
      client:
        generators:
          - typescript
          - ./generators/php.mjs
    `);
    // A real list entry is — the file stays unchanged.
    const wired = outdent`
      client:
        generators:
          - ./generators/php.mjs
    `;
    expect(wire(wired)).toBe(wired);
  });

  it('reads through comments in the list: inline ones survive a replace, entries below comment lines count', () => {
    expect(
      wire(outdent`
        client:
          generators:
            # our copies:
            - php # ours
            - typescript
      `)
    ).toBe(outdent`
      client:
        generators:
          # our copies:
          - ./generators/php.mjs # ours
          - typescript
    `);
    // An already-wired entry behind a comment line is found, not duplicated.
    const wired = outdent`
      client:
        generators:
          - typescript
          # ejected:
          - ./generators/php.mjs
    `;
    expect(wire(wired)).toBe(wired);
  });

  it('prints the snippet instead when an api has its own client block', () => {
    // `forAlias` replaces the top-level `client` with the api's block wholesale, so
    // inserting top-level keys would report "wired" while generation ignores them.
    const dir = mkdtempSync(join(tmpdir(), 'redocly-wire-config-'));
    const configPath = join(dir, 'redocly.yaml');
    writeFileSync(
      configPath,
      outdent`
        apis:
          cafe:
            root: ./openapi.yaml
            client:
              argsStyle: grouped
      `,
      'utf-8'
    );
    try {
      expect(wireConfig(configPath, 'php', './generators/php.mjs')).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('appends a client block when the config has none', () => {
    expect(
      wire(
        outdent`
        apis:
          cafe:
            root: ./openapi.yaml
            clientOutput: ./src/client.ts
      ` + '\n'
      )
    ).toBe(
      outdent`
        apis:
          cafe:
            root: ./openapi.yaml
            clientOutput: ./src/client.ts
        client:
          generators:
            - ./generators/php.mjs
      ` + '\n'
    );
  });
});

describe('threeWayMerge', () => {
  beforeEach(reset);

  it('merges cleanly and counts conflicts', () => {
    const base = 'a\nb\nc\nd\ne\n';
    expect(threeWayMerge('A\nb\nc\nd\ne\n', base, 'a\nb\nc\nd\nE\n')).toEqual({
      merged: 'A\nb\nc\nd\nE\n',
      conflicts: 0,
    });
    const conflicted = threeWayMerge('a\nyours\nc\nd\ne\n', base, 'a\ntheirs\nc\nd\ne\n');
    expect(conflicted.conflicts).toBe(1);
    expect(conflicted.merged).toContain('<<<<<<<');
  });

  it("keeps the user's copy when git merge-file errors instead of counting conflicts", () => {
    // Binary (NUL-byte) content makes `git merge-file` exit 255 with empty stdout —
    // that must surface as an error, never as "255 conflicts" written over the file.
    expect(() => threeWayMerge('customized\0', 'base\0', 'updated\0')).toThrow(
      /could not merge the update/
    );
    expect(ejectGeneratorTelemetry.eject_generator_outcome).toBe('merge-failed');
  });
});

describe('eject telemetry (coarse categories only)', () => {
  beforeEach(reset);

  it('a framework variant records the allowlisted name and a guidance action', async () => {
    // Every generator ejects now; only the tanstack-query framework variants are guidance,
    // since they are that generator with one argument changed.
    await handleEjectGenerator({
      ...baseArgs,
      argv: { generator: 'tanstack-query-vue' },
    } as CommandArgs<never>);
    expect(ejectGeneratorTelemetry).toEqual({
      eject_generator_action: 'guidance',
      eject_generator_name: 'tanstack-query-vue',
      eject_generator_outcome: 'success',
    });
  });

  it('a failure we did not account for still records an outcome', async () => {
    // The shipped assets sit next to the BUILT module, so reading one from source fails
    // the same way a broken install would — an error no branch sets an outcome for.
    await expect(
      handleEjectGenerator({
        ...baseArgs,
        argv: { generator: 'php', update: true },
      } as CommandArgs<never>)
    ).rejects.toThrow();
    expect(ejectGeneratorTelemetry).toEqual({
      eject_generator_action: 'update',
      eject_generator_name: 'php',
      eject_generator_outcome: 'unexpected-error',
    });
  });

  it('an unknown generator records the outcome but never the user-supplied name', async () => {
    await expect(
      handleEjectGenerator({
        ...baseArgs,
        argv: { generator: 'my-secret-internal-api' },
      } as CommandArgs<never>)
    ).rejects.toThrow(/Unknown generator/);
    expect(ejectGeneratorTelemetry.eject_generator_outcome).toBe('unknown-generator');
    expect(ejectGeneratorTelemetry.eject_generator_name).toBeUndefined();
  });
});
