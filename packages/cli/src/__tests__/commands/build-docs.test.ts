import { createConfig, HandledError, logger } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  escapeClosingScriptTag,
  getPageHTML,
  getRedocOptions,
  sanitizeJSONString,
} from '../../commands/build-docs/utils.js';

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

  describe('getPageHTML', () => {
    const cafe = { openapi: '3.2.0', info: { title: 'Redocly Cafe', version: '1.0.0' }, paths: {} };
    const options = { output: 'redoc-static.html', redocVersion: '3.0.1', templateOptions: {} };
    const titleOf = (html: string) => html.match(/<title>(.*)<\/title>/)?.[1];

    beforeEach(() => {
      vi.mocked(fs.readFileSync).mockReturnValue('export function hydrate() {}</script>');
    });

    it('prefers the title option over the title of the description', async () => {
      const html = await getPageHTML(cafe, { ...options, title: 'Cafe docs' });

      expect(titleOf(html)).toBe('Cafe docs');
    });

    it('gives a GraphQL schema a default title', async () => {
      const html = await getPageHTML('type Query { menu: [String] }', options);

      expect(titleOf(html)).toBe('ReDoc documentation');
    });

    it('uses the template file over the htmlTemplate option', async () => {
      vi.mocked(fs.readFileSync).mockReturnValueOnce('<title>{{title}}</title>');

      const html = await getPageHTML(cafe, {
        ...options,
        templateFileName: 'custom.hbs',
        redocOptions: { htmlTemplate: 'other.hbs' },
      });

      expect(fs.readFileSync).toHaveBeenCalledWith('custom.hbs', 'utf-8');
      expect(html).toBe('<title>Redocly Cafe</title>');
    });

    it('reads the htmlTemplate option from the config folder and leaves it out of the page', async () => {
      vi.mocked(fs.readFileSync).mockReturnValueOnce('{{{redocHTML}}}');

      const html = await getPageHTML(
        cafe,
        { ...options, redocOptions: { htmlTemplate: 'templates/cafe.hbs' } },
        '/project/redocly.yaml'
      );

      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.resolve('/project', 'templates/cafe.hbs'),
        'utf-8'
      );
      expect(html).toContain('const __redoc_options = {"skipBundle":true}');
    });

    it('escapes </script in the inlined Redoc bundle', async () => {
      const html = await getPageHTML(cafe, { ...options, inlineBundle: true });

      expect(html).toContain('export function hydrate() {}<\\/script>');
    });
  });

  describe('sanitizeJSONString', () => {
    it('escapes every < and the U+2028 and U+2029 separators', () => {
      expect(sanitizeJSONString('"</SCRIPT> <!-- \u2028 \u2029"')).toBe(
        '"\\u003c/SCRIPT> \\u003c!-- \\u2028 \\u2029"'
      );
    });
  });

  describe('escapeClosingScriptTag', () => {
    it('escapes </script in any letter case', () => {
      expect(escapeClosingScriptTag('a</script>b</SCRIPT >c')).toBe('a<\\/script>b<\\/SCRIPT >c');
    });
  });
});
