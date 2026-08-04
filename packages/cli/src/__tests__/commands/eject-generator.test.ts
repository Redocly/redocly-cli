import { handleEjectGenerator } from '../../commands/eject-generator.js';
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

describe('eject telemetry (coarse categories only)', () => {
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
});
