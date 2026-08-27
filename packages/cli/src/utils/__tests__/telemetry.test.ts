import { createConfig } from '@redocly/openapi-core';
import * as childProcess from 'node:child_process';
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
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof childProcess>();
  return { ...actual, execSync: vi.fn(actual.execSync) };
});

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
    respect_source_description_types: undefined,
    respect_criterion_object_types: undefined,
    lint_rules_with_errors: undefined,
    lint_rules_with_warnings: undefined,
    lint_rules_with_ignored_problems: undefined,
  });

  expect(respondWithinMs).toHaveBeenCalled();
  expect(RedoclyOAuthClient).toHaveBeenCalled();
  expect(getReuniteUrl).toHaveBeenCalled();
  expect(mockMapToCloudEvent).toHaveBeenCalledWith(expect.objectContaining({ env: 'development' }));
  expect(mockOtelSend).toHaveBeenCalled();
});

it('sendTelemetry sends the event when npm is not available', async () => {
  vi.mocked(respondWithinMs).mockResolvedValue(true);
  vi.mocked(childProcess.execSync).mockImplementation(() => {
    throw Object.assign(new Error('spawnSync /bin/sh ENOENT'), { code: 'ENOENT' });
  });

  await sendTelemetry({
    config: await createConfig({}),
    argv: { _: ['respect'] } as any,
    exit_code: 0,
    execution_time: 1500,
    spec_version: 'arazzo1',
    spec_keyword: 'arazzo',
    spec_full_version: '1.0.1',
    respect_x_security_auth_types: undefined,
    respect_source_description_types: undefined,
    respect_criterion_object_types: undefined,
    lint_rules_with_errors: undefined,
    lint_rules_with_warnings: undefined,
    lint_rules_with_ignored_problems: undefined,
  });

  expect(mockMapToCloudEvent).toHaveBeenCalledWith(
    expect.objectContaining({ data: [expect.objectContaining({ npm_version: 'unknown' })] })
  );
  expect(mockOtelSend).toHaveBeenCalled();
});
