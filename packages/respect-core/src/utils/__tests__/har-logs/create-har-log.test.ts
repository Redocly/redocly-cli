import { createHarLog } from '../../har-logs';

describe('createHarLog', () => {
  it('should create a har log', () => {
    const mockDate = new Date('2024-01-01T00:00:00.000Z');
    vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    const harLog = createHarLog();
    expect(harLog).toEqual({
      log: {
        version: '1.2',
        creator: {
          name: '@redocly/respect-core',
          version: expect.any(String),
        },
        pages: [
          {
            startedDateTime: '2024-01-01T00:00:00.000Z',
            id: 'page_1',
            title: 'Page',
            pageTimings: {
              onContentLoad: -1,
              onLoad: -1,
            },
          },
        ],
        entries: [],
      },
    });

    vi.restoreAllMocks();
  });
});
