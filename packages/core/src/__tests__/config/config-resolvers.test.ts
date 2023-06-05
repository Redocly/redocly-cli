jest.mock('node-fetch');

import fetch, {Response} from 'node-fetch';
import { mocked } from 'ts-jest/utils';

import { resolvePlugins } from '../../config';

describe('config-resolvers', () => {
  it('loads plugin from local file system', async () => {
    const path = __dirname + '/../fixtures/redocly-plugin.js';

    const plugins = await resolvePlugins([path]);

    expect(plugins).toHaveLength(1);
    expect(plugins[0].id).toEqual('getyourguide');
    expect(plugins[0].rules).toBeDefined();
    expect(plugins[0].rules?.oas3).toBeDefined();
  });

  it('loads plugin from remote url', async () => {
    mocked(fetch).mockReturnValue(Promise.resolve({ text: () => Promise.resolve(`
const UniqueSchemaName = function UniqueSchemaName() {
    return {};
};
const id = 'getyourguide';

const rules = {
    oas3: {
        'unique-schema-name': UniqueSchemaName,
    },
};

module.exports = {
    id,
    rules,
};
    `)}) as Promise<Response>);

    const plugins = await resolvePlugins(['https://example.com/getyourguide.js']);

    expect(plugins).toHaveLength(1);
    expect(plugins[0].id).toEqual('getyourguide');
    expect(plugins[0].rules).toBeDefined();
    expect(plugins[0].rules?.oas3).toBeDefined();
  });
});
