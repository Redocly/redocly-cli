import { handleEjectGenerator } from '../../commands/eject-generator.js';
import { handleScaffoldGenerator } from '../../commands/scaffold-generator.js';
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

describe('eject/scaffold telemetry (coarse categories only)', () => {
  beforeEach(reset);

  it('sdk guidance records the allowlisted name and a guidance action', async () => {
    await handleEjectGenerator({ ...baseArgs, argv: { generator: 'sdk' } } as CommandArgs<never>);
    expect(ejectGeneratorTelemetry).toEqual({
      eject_generator_action: 'guidance',
      eject_generator_name: 'sdk',
      eject_generator_outcome: 'success',
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

  it('scaffolding a built-in name records the refusal, not the name', async () => {
    await expect(
      handleScaffoldGenerator({ ...baseArgs, argv: { generator: 'php' } } as CommandArgs<never>)
    ).rejects.toThrow(/built-in generator/);
    expect(ejectGeneratorTelemetry).toEqual({
      eject_generator_action: 'scaffold',
      eject_generator_outcome: 'builtin-name',
    });
  });
});
