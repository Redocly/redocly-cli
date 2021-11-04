import { handlePush } from '../../commands/push'
import { loadConfig, RedoclyClient } from '@redocly/openapi-core';

jest.mock('fs');
jest.mock('node-fetch');
jest.mock('@redocly/openapi-core');
jest.mock('../../utils');

jest.requireMock('@redocly/openapi-core').slash = jest.fn(); // for some reason slash is not mocked, mocking explicitly

describe('push', () => {
  const redoclyClient = require('@redocly/openapi-core').__redoclyClient;

  beforeAll(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    redoclyClient.createDefinitionVersion.mockClear();
    redoclyClient.updateDefinitionVersion.mockClear();
  });

  it('creates new definition', async () => {
    redoclyClient.getDefinitionVersion.mockImplementationOnce(() => ({ version: null }));

    await handlePush({
      upsert: true,
      entrypoint: 'spec.yaml',
      destination: '@org/my-api@1.0.1',
      branchName: 'test',
    });

    expect(redoclyClient.createDefinitionVersion).toBeCalledTimes(1);
    expect(redoclyClient.updateDefinitionVersion).toBeCalledTimes(0);
  });

  it('updates existing definition', async () => {
    redoclyClient.getDefinitionVersion.mockImplementationOnce(() => ({ version: '1.0.0' }));

    await handlePush({
      upsert: true,
      entrypoint: 'spec.json',
      destination: '@org/my-api@1.0.0',
      branchName: 'test',
    });

    expect(redoclyClient.createDefinitionVersion).toBeCalledTimes(0);
    expect(redoclyClient.updateDefinitionVersion).toBeCalledTimes(1);
  });

  it('uses region option', async () => {
    const region = 'us';
    const redoclyDomain = 'some-domain';

    redoclyClient.getDefinitionVersion.mockImplementationOnce(() => ({ version: '1.0.0' }));
    (loadConfig as jest.Mock).mockImplementationOnce(async () => ({ redoclyDomain }));

    await handlePush({
      region,
      upsert: true,
      entrypoint: 'spec.json',
      destination: '@org/my-api@1.0.0',
      branchName: 'test',
    });

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region }));
    expect(RedoclyClient).toHaveBeenCalledWith(redoclyDomain);

    (loadConfig as jest.Mock).mockClear();
  });
});
