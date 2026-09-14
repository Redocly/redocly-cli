import * as childProcess from 'node:child_process';
import { it, expect, vi } from 'vitest';

import { RedoclyOAuthClient } from '../../auth/oauth-client.js';
import { sendTelemetry, sendTelemetryInBackground, type TelemetryPayload } from '../telemetry.js';

const mockMapToCloudEvent = vi.hoisted(() => vi.fn());
const mockOtelSend = vi.hoisted(() => vi.fn());

vi.mock('@redocly/cli-otel', () => ({ CloudEvents: { mapToCloudEvent: mockMapToCloudEvent } }));
vi.mock('../otel.js', () => ({ otelTelemetry: { send: mockOtelSend } }));
vi.mock('../../auth/oauth-client.js');
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof childProcess>();
  return { ...actual, execSync: vi.fn(actual.execSync), spawn: vi.fn() };
});

const argv = { _: ['lint'], $0: 'redocly' };

type CommandTelemetry = Omit<TelemetryPayload, 'argv' | 'raw_argv' | 'reunite_url' | 'has_config'>;

const commandTelemetry: CommandTelemetry = {
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
};

const payload: TelemetryPayload = {
  ...commandTelemetry,
  argv,
  raw_argv: ['lint', 'openapi.yaml'],
  reunite_url: 'https://app.cloud.redocly.com',
  has_config: 'no',
};

it('sendTelemetryInBackground starts a detached worker and passes the payload on stdin', async () => {
  const stdin = { on: vi.fn(), end: vi.fn() };
  vi.mocked(childProcess.spawn).mockReturnValue({ on: vi.fn(), unref: vi.fn(), stdin } as any);

  await sendTelemetryInBackground({ config: undefined, argv, ...commandTelemetry });

  expect(childProcess.spawn).toHaveBeenCalledWith(
    process.execPath,
    [process.argv[1], 'send-telemetry'],
    expect.objectContaining({ detached: true, stdio: ['pipe', 'ignore', 'ignore'] })
  );
  expect(JSON.parse(stdin.end.mock.calls[0][0])).toEqual({
    ...commandTelemetry,
    argv,
    raw_argv: process.argv.slice(2),
    reunite_url: 'https://app.cloud.redocly.com',
    has_config: 'no',
  });
});

it('sendTelemetry calls all telemetry functions', async () => {
  await sendTelemetry(payload);

  expect(RedoclyOAuthClient).toHaveBeenCalled();
  expect(mockMapToCloudEvent).toHaveBeenCalledWith(expect.objectContaining({ env: 'development' }));
  expect(mockOtelSend).toHaveBeenCalled();
});

it('sendTelemetry sends the event when npm is not available', async () => {
  vi.mocked(childProcess.execSync).mockImplementation(() => {
    throw Object.assign(new Error('spawnSync /bin/sh ENOENT'), { code: 'ENOENT' });
  });

  await sendTelemetry({
    ...payload,
    argv: { _: ['respect'], $0: 'redocly' },
    spec_version: 'arazzo1',
    spec_keyword: 'arazzo',
    spec_full_version: '1.0.1',
  });

  expect(mockMapToCloudEvent).toHaveBeenCalledWith(
    expect.objectContaining({ data: [expect.objectContaining({ npm_version: 'unknown' })] })
  );
  expect(mockOtelSend).toHaveBeenCalled();
});
