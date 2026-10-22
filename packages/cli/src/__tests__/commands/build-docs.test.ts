import { createConfig, HandledError, logger } from '@redocly/openapi-core';
import * as fs from 'node:fs';

import { getRedocOptions } from '../../commands/build-docs/utils.js';

vi.mock('node:fs');

describe('build-docs', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'info').mockImplementation(() => {});
  });

  describe('getRedocOptions', () => {
    it('returns options given as an object as they are', async () => {
      const options = { hideDownloadButtons: true };

      expect(getRedocOptions(options, await createConfig({}), 'openapi')).toBe(options);
    });

    it('reads options from a JSON file', async () => {
      const redoclyConfig = await createConfig({});
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      vi.mocked(fs.lstatSync).mockReturnValueOnce({ isFile: () => true } as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValueOnce('{"hideDownloadButtons":true}');

      expect(getRedocOptions('options.json', redoclyConfig, 'openapi')).toEqual({
        hideDownloadButtons: true,
      });
      expect(fs.readFileSync).toHaveBeenCalledWith('options.json', 'utf-8');
    });

    it('parses options given as a JSON string', async () => {
      expect(
        getRedocOptions('{"hideDownloadButtons":true}', await createConfig({}), 'openapi')
      ).toEqual({ hideDownloadButtons: true });
    });

    it('falls back to the matching key of the configuration file', async () => {
      const redoclyConfig = await createConfig(
        { asyncapi: { jsonSamplesDepth: 4 } },
        { configPath: 'redocly.yaml' }
      );

      expect(getRedocOptions(undefined, redoclyConfig, 'asyncapi')).toEqual({
        jsonSamplesDepth: 4,
      });
      expect(getRedocOptions(undefined, redoclyConfig, 'graphql')).toEqual({});
    });

    it('returns no options without a configuration file', async () => {
      expect(getRedocOptions(undefined, await createConfig({}), 'openapi')).toEqual({});
    });

    it('rejects a JSON value that is not an object', async () => {
      const redoclyConfig = await createConfig({});

      expect(() => getRedocOptions('null', redoclyConfig, 'openapi')).toThrow(
        'Expected --openapi to be a JSON object or a path to a JSON file, got: null'
      );
      expect(() => getRedocOptions(['a', 'b'], redoclyConfig, 'asyncapi')).toThrow(
        'Expected --asyncapi to be a JSON object or a path to a JSON file, got: ["a","b"]'
      );
    });

    it('reports an invalid value with the parse error', async () => {
      const redoclyConfig = await createConfig({});

      expect(() => getRedocOptions('not json', redoclyConfig, 'openapi')).toThrow(HandledError);
      expect(() => getRedocOptions('not json', redoclyConfig, 'openapi')).toThrow(
        /^Expected --openapi to be a JSON object or a path to a JSON file, got: not json\nUnexpected token/
      );
    });
  });
});
