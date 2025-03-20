import * as fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('../../../package.json', 'utf-8'));
const { name: packageName, version: packageVersion } = packageJson;

export function createHarLog(entries: any[] = [], pageInfo: any = {}): any {
  return {
    log: {
      version: '1.2',
      creator: {
        name: packageName,
        version: packageVersion,
      },
      pages: [
        Object.assign(
          {
            startedDateTime: new Date().toISOString(),
            id: 'page_1',
            title: 'Page',
            pageTimings: {
              onContentLoad: -1,
              onLoad: -1,
            },
          },
          pageInfo
        ),
      ],
      entries,
    },
  };
}
