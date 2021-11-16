import { handlePush } from '../../commands/push';

jest.mock('fs');
jest.mock('node-fetch');
jest.mock('@redocly/openapi-core');
jest.mock('../../utils');

describe('push', () => {
  const redoclyClient = require('@redocly/openapi-core').__redoclyClient;

  beforeAll(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('pushes definition', async () => {
    await handlePush({
      upsert: true,
      entrypoint: 'spec.json',
      destination: '@org/my-api@1.0.0',
      branchName: 'test',
    });

    expect(redoclyClient.registryApi.prepareFileUpload).toBeCalledTimes(1);
    expect(redoclyClient.registryApi.pushApi).toBeCalledTimes(1);
    expect(redoclyClient.registryApi.pushApi).toHaveBeenLastCalledWith({
      branch: 'test',
      filePaths: ['filePath'],
      isUpsert: true,
      name: 'my-api',
      organizationId: 'org',
      rootFilePath: 'filePath',
      version: '1.0.0',
    });
  });
});
