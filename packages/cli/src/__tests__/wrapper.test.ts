import { loadConfigAndHandleErrors, sendTelemetry } from '../utils/miscellaneous';
import * as process from 'node:process';
import { commandWrapper } from '../wrapper';
import { handleLint } from '../commands/lint';
import { type Config, detectSpec, type SpecVersion } from '@redocly/openapi-core';

const originalFetch = global.fetch;

describe('commandWrapper', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.mock('@redocly/openapi-core', async () => {
      const actual = await vi.importActual('@redocly/openapi-core');
      return {
        ...actual,
        detectSpec: vi.fn(),
      };
    });
    vi.mock('../utils/miscellaneous');
    vi.mock('../commands/lint');
  });
  afterEach(() => {
    global.fetch = originalFetch;
    process.env.REDOCLY_TELEMETRY = undefined;
  });

  it('should send telemetry if there is "telemetry: on" in the config', async () => {
    vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
      return { telemetry: 'on', styleguide: { recommendedFallback: true } } as Config;
    });
    vi.mocked(detectSpec).mockImplementationOnce(() => {
      return 'oas3_1' as SpecVersion;
    });
    vi.mocked(handleLint).mockImplementation(async ({ collectSpecData }) => {
      collectSpecData?.({ openapi: '3.1.0' });
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledWith({}, 0, false, 'oas3_1', 'openapi', '3.1.0');
  });

  it('should not collect spec version if the file is not parsed to json', async () => {
    vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
      return { telemetry: 'on', styleguide: { recommendedFallback: true } } as Config;
    });
    vi.mocked(handleLint).mockImplementation(async ({ collectSpecData }: any) => {
      collectSpecData();
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledWith({}, 0, false, undefined, undefined, undefined);
  });

  it('should NOT send telemetry if there is "telemetry: off" in the config', async () => {
    vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
      return { telemetry: 'off', styleguide: { recommendedFallback: true } } as Config;
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);

    expect(sendTelemetry).toHaveBeenCalledTimes(0);
  });
});
