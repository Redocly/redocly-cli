import { type Config, detectSpec, makeDocumentFromString } from '@redocly/openapi-core';
import * as process from 'node:process';

import { handleLint } from '../commands/lint.js';
import { loadConfigAndHandleErrors } from '../utils/miscellaneous.js';
import { sendTelemetry } from '../utils/telemetry.js';
import { commandWrapper } from '../wrapper.js';

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
    vi.mock('../utils/miscellaneous.js');
    vi.mock('../utils/telemetry.js');
    vi.mock('../commands/lint.js');
  });
  afterEach(() => {
    global.fetch = originalFetch;
    process.env.REDOCLY_TELEMETRY = undefined;
  });

  it('should send telemetry if there is "telemetry: on" in the config', async () => {
    vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
      return { resolvedConfig: { telemetry: 'on' } } as Config;
    });
    vi.mocked(detectSpec).mockImplementationOnce(() => {
      return 'oas3_1';
    });
    vi.mocked(handleLint).mockImplementation(async ({ collectSpecData }) => {
      collectSpecData?.(makeDocumentFromString('openapi: 3.1.0', 'openapi.yaml'));
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          resolvedConfig: {
            telemetry: 'on',
          },
        },
        argv: {},
        execution_time: expect.any(Number),
        exit_code: 0,
        spec_version: 'oas3_1',
        spec_keyword: 'openapi',
        spec_full_version: '3.1.0',
        respect_x_security_auth_types: [],
        respect_source_description_types: [],
        respect_criterion_object_types: [],
      })
    );
  });

  it('should not collect spec version if the file is not parsed to json (except for graphql)', async () => {
    vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
      return { resolvedConfig: { telemetry: 'on' } } as Config;
    });
    vi.mocked(handleLint).mockImplementation(async ({ collectSpecData }) => {
      collectSpecData?.(makeDocumentFromString('some text file', 'some.txt'));
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          resolvedConfig: {
            telemetry: 'on',
          },
        },
        argv: {},
        execution_time: expect.any(Number),
        exit_code: 0,
        spec_version: undefined,
        spec_keyword: undefined,
        spec_full_version: undefined,
        respect_x_security_auth_types: [],
        respect_source_description_types: [],
        respect_criterion_object_types: [],
      })
    );
  });

  it('should collect the spec version of a GraphQL document', async () => {
    vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
      return { resolvedConfig: { telemetry: 'on' } } as Config;
    });
    vi.mocked(handleLint).mockImplementation(async ({ collectSpecData }) => {
      collectSpecData?.(makeDocumentFromString('type Query { cafe: String }', 'some.graphql'));
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(sendTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        spec_version: 'graphql',
        spec_keyword: undefined,
        spec_full_version: undefined,
      })
    );
  });

  it('should not keep the spec keyword of a previously linted document', async () => {
    vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
      return { resolvedConfig: { telemetry: 'on' } } as Config;
    });
    vi.mocked(detectSpec).mockImplementationOnce(() => {
      return 'oas3_1';
    });
    vi.mocked(handleLint).mockImplementation(async ({ collectSpecData }) => {
      collectSpecData?.(makeDocumentFromString('openapi: 3.1.0', 'openapi.yaml'));
      collectSpecData?.(makeDocumentFromString('type Query { cafe: String }', 'some.graphql'));
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(sendTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        spec_version: 'graphql',
        spec_keyword: undefined,
        spec_full_version: undefined,
      })
    );
  });

  it('should NOT send telemetry if there is "telemetry: off" in the config', async () => {
    vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
      return { resolvedConfig: { telemetry: 'off' } } as Config;
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);

    expect(sendTelemetry).toHaveBeenCalledTimes(0);
  });
});
