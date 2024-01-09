import { handlePushStatus } from '../push-status';
import { PushStatusResponse } from '@redocly/openapi-core';

const remotes = {
  getPushStatus: jest.fn(),
  getRemotesList: jest.fn(),
};

jest.mock('@redocly/openapi-core', () => ({
  ...jest.requireActual('@redocly/openapi-core'),
  BlueHarvestApiClient: jest.fn().mockImplementation(function (this: any, ...args) {
    this.remotes = remotes;
  }),
}));

// describe('handlePushStatus()', () => {
//   const pushResponseStub: PushStatusResponse = {
//     buildUrlLogs: 'https://test-build-url-logs',
//     deploymentStatus: 'SUCCEEDED',
//     scorecard: [],
//     status: 'SUCCEEDED',
//     url: 'https://test-url',
//   };

//   beforeEach(() => {
//     remotes.getRemotesList.mockResolvedValueOnce({ items: [{ id: 'test-remote-id' }] });

//     remotes.getPushStatus.mockResolvedValueOnce(pushResponseStub);

//     jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
//     jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
//   });

//   it('should return success push status', async () => {
//     const mockConfig = { apis: {} } as any;
//     process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

//     await handlePushStatus(
//       {
//         domain: 'test-domain',
//         mountPath: 'test-mount-path',
//         organization: 'test-org',
//         project: 'test-project',
//         pushId: 'test-push-id',
//         format: 'json',
//       },
//       mockConfig
//     );

//     expect(remotes.getRemotesList).toHaveBeenCalledWith(
//       'test-org',
//       'test-project',
//       'test-mount-path'
//     );
//     expect(process.stderr.write).toHaveBeenCalledTimes(2);
//     expect(process.stdout.write).toHaveBeenCalledWith(
//       JSON.stringify(
//         {
//           status: 'Success',
//           buildUrlLogs: 'https://test-build-url-logs',
//           url: 'https://test-url',
//         },
//         null,
//         2
//       )
//     );
//   });
// });
