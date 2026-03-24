import { createConfig } from '@redocly/openapi-core';
import { it, expect, vi } from 'vitest';

import { RedoclyOAuthClient } from '../../auth/oauth-client.js';
import { getReuniteUrl } from '../../reunite/api/index.js';
import { respondWithinMs } from '../network-check.js';
import { sendTelemetry } from '../telemetry.js';

const mockMapToCloudEvent = vi.hoisted(() => vi.fn());
const mockOtelSend = vi.hoisted(() => vi.fn());

vi.mock('@redocly/cli-otel', () => ({ CloudEvents: { mapToCloudEvent: mockMapToCloudEvent } }));
vi.mock('../otel.js', () => ({ otelTelemetry: { send: mockOtelSend } }));
vi.mock('../network-check.js');
vi.mock('../../auth/oauth-client.js');
vi.mock('../../reunite/api/index.js');

it('sendTelemetry calls all telemetry functions', async () => {
  vi.mocked(respondWithinMs).mockResolvedValue(true);

  await sendTelemetry({
    config: await createConfig({}),
    argv: { _: ['lint'] } as any,
    exit_code: 0,
    execution_time: 1500,
    spec_version: 'oas3_1',
    spec_keyword: 'openapi',
    spec_full_version: '3.1.0',
    respect_x_security_auth_types: undefined,
  });

  expect(respondWithinMs).toHaveBeenCalled();
  expect(RedoclyOAuthClient).toHaveBeenCalled();
  expect(getReuniteUrl).toHaveBeenCalled();
  expect(mockMapToCloudEvent).toHaveBeenCalled();
  expect(mockOtelSend).toHaveBeenCalled();
});
