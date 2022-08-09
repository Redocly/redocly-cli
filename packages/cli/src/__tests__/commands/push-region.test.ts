import { getMergedConfig } from '@redocly/openapi-core';
import { handlePush } from '../../commands/push';
import { promptClientToken } from '../../commands/login';

jest.mock('fs');
jest.mock('node-fetch', () => ({
  default: jest.fn(() => ({
    ok: true,
    json: jest.fn().mockResolvedValue({}),
  })),
}));
jest.mock('@redocly/openapi-core');
jest.mock('../../commands/login');
jest.mock('../../utils');

(getMergedConfig as jest.Mock).mockImplementation((config) => config);

const mockPromptClientToken = promptClientToken as jest.MockedFunction<typeof promptClientToken>;

describe('push-with-region', () => {
  const redoclyClient = require('@redocly/openapi-core').__redoclyClient;
  redoclyClient.isAuthorizedWithRedoclyByRegion = jest.fn().mockResolvedValue(false);

  beforeAll(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('should call login with default domain when region is US', async () => {
    redoclyClient.domain = 'redoc.ly';
    await handlePush({
      upsert: true,
      api: 'spec.json',
      destination: '@org/my-api@1.0.0',
      branchName: 'test',
    });
    expect(mockPromptClientToken).toBeCalledTimes(1);
    expect(mockPromptClientToken).toHaveBeenCalledWith(redoclyClient.domain);
  });

  it('should call login with EU domain when region is EU', async () => {
    redoclyClient.domain = 'eu.redocly.com';
    await handlePush({
      upsert: true,
      api: 'spec.json',
      destination: '@org/my-api@1.0.0',
      branchName: 'test',
    });
    expect(mockPromptClientToken).toBeCalledTimes(1);
    expect(mockPromptClientToken).toHaveBeenCalledWith(redoclyClient.domain);
  });
});
