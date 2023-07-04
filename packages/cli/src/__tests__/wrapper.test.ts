import { loadConfigAndHandleErrors, sendTelemetry } from '../utils';
import * as process from 'process';
import { commandWrapper } from '../wrapper';
import { handleLint } from '../commands/lint';
import { Arguments } from 'yargs';
import { handlePush, PushOptions } from '../commands/push';

jest.mock('node-fetch');
jest.mock('../utils', () => ({
  sendTelemetry: jest.fn(),
  loadConfigAndHandleErrors: jest.fn(),
}));
jest.mock('../commands/lint', () => ({
  handleLint: jest.fn(),
  lintConfigCallback: jest.fn(),
}));

describe('commandWrapper', () => {
  it('should send telemetry if there is "telemetry: on" in the config', async () => {
    (loadConfigAndHandleErrors as jest.Mock).mockImplementation(() => {
      return { telemetry: 'on', styleguide: { recommendedFallback: true } };
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledWith({}, 0, false);
  });

  it('should NOT send telemetry if there is "telemetry: off" in the config', async () => {
    (loadConfigAndHandleErrors as jest.Mock).mockImplementation(() => {
      return { telemetry: 'off', styleguide: { recommendedFallback: true } };
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);

    expect(sendTelemetry).toHaveBeenCalledTimes(0);
  });

  it('should pass files from arguments to config', async () => {
    const filesToPush = ['test1.yaml', 'test2.yaml'];

    const loadConfigMock = loadConfigAndHandleErrors as jest.Mock<any, any>;

    const argv = {
      files: filesToPush,
    } as Arguments<PushOptions>;

    await commandWrapper(handlePush)(argv);
    expect(loadConfigMock).toHaveBeenCalledWith(expect.objectContaining({ files: filesToPush }));
  });
});
