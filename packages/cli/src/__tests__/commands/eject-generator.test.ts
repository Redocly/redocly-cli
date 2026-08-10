import { handleEjectGenerator, threeWayMerge } from '../../commands/eject-generator.js';
import { ejectGeneratorTelemetry } from '../../utils/generate-client-telemetry.js';
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
