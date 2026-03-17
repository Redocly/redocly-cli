import * as process from 'node:process';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockMapToCloudEvent, mockOtelSend } = vi.hoisted(() => ({
  mockMapToCloudEvent: vi.fn(),
  mockOtelSend: vi.fn(),
}));

vi.mock('@redocly/cli-otel', () => ({
  CloudEvents: { cloudEvents: { mapToCloudEvent: mockMapToCloudEvent } },
}));
vi.mock('../otel.js', () => ({ otelTelemetry: { send: mockOtelSend } }));
vi.mock('../network-check.js');
vi.mock('../../auth/oauth-client.js');
vi.mock('../../reunite/api/index.js');

import { RedoclyOAuthClient } from '../../auth/oauth-client.js';
import { getReuniteUrl } from '../../reunite/api/index.js';
import { respondWithinMs } from '../network-check.js';
import { sendTelemetry } from '../telemetry.js';

const DEFAULT_ARGS = {
  config: { document: { parsed: {} } } as any,
  argv: { _: ['lint'], $0: 'redocly' } as any,
  exit_code: 0,
  execution_time: 1500,
  spec_version: 'oas3_1',
  spec_keyword: 'openapi',
  spec_full_version: '3.1.0',
  respect_x_security_auth_types: undefined,
} as const;

function getCloudEventCall() {
  return mockMapToCloudEvent.mock.calls[0][0];
}

describe('sendTelemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMapToCloudEvent.mockReturnValue({ id: 'mapped-event', type: 'com.redocly.command.ran' });
    vi.mocked(respondWithinMs).mockResolvedValue(true);
    vi.mocked(RedoclyOAuthClient).mockImplementation(function () {
      return { isAuthorized: vi.fn().mockResolvedValue(true) } as any;
    });
    vi.mocked(getReuniteUrl).mockReturnValue('https://app.redocly.com' as any);
    process.env.CI = 'true';
    process.env.REDOCLY_ENVIRONMENT = 'docker';
  });

  afterEach(() => {
    delete process.env.CI;
    delete process.env.REDOCLY_ENVIRONMENT;
    delete process.env.REDOCLY_CLI_TELEMETRY_METADATA;
  });

  it('should build CloudEvent with correct structure and send it', async () => {
    await sendTelemetry(DEFAULT_ARGS);

    const { data, ...envelope } = getCloudEventCall();

    expect(envelope).toMatchObject({
      type: 'com.redocly.command.ran',
      source: 'com.redocly.cli',
      origin: 'redocly-cli',
      category: 'product',
      osPlatform: expect.any(String),
      actor: { id: expect.stringMatching(/^ann_/), object: 'user', uri: '' },
    });

    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: 'cli-command-run',
      object: 'command',
      uri: 'urn:redocly:cli',
      command: 'lint',
      exit_code: 0,
      execution_time: 1500,
      logged_in: 'yes',
      has_config: 'yes',
      version: expect.any(String),
      node_version: process.version,
      npm_version: expect.any(String),
      spec_version: 'oas3_1',
      spec_keyword: 'openapi',
      spec_full_version: '3.1.0',
      environment_ci: 'true',
      environment: 'docker',
    });

    expect(mockOtelSend).toHaveBeenCalledWith({
      id: 'mapped-event',
      type: 'com.redocly.command.ran',
    });
  });

  it('should include respect_x_security_auth_types for arazzo1', async () => {
    await sendTelemetry({
      ...DEFAULT_ARGS,
      spec_version: 'arazzo1',
      respect_x_security_auth_types: ['bearer', 'apiKey'],
    });

    expect(getCloudEventCall().data[0].respect_x_security_auth_types).toBe(
      JSON.stringify(['bearer', 'apiKey'])
    );
  });
});
