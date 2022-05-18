import outdent from 'outdent';
import { detectOpenAPI } from '../src/oas-types';
import { parseYamlToDocument } from './utils';

describe('lint', () => {
	it('detect OpenAPI should throw an error when version is not string', () => {

	const testDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0
      `,
      '',
    );
		expect(() => detectOpenAPI(testDocument.parsed))
			.toThrow(`Invalid OpenAPI version: should be a string but got "number"`)
	});
});
