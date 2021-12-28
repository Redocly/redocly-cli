import { outdent } from 'outdent';
import { bundleDocument } from '../../bundle'
import { BaseResolver } from '../../resolve';
import { parseYamlToDocument, yamlSerializer } from '../../../__tests__/utils';
import { makeConfig } from './config';

describe('oas3 hide-internals', () => {
  expect.addSnapshotSerializer(yamlSerializer);
	const testDocument = parseYamlToDocument(
		outdent`
			openapi: 3.0.0
			paths:
        /pet:
          hideit: true
          get:
            parameters:
              - $ref: '#/components/parameters/x'
			components:
        parameters:
          x:
            name: x
		`);

  it('should use `tagToHide` option to remove internal paths', async () => {
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: makeConfig({}, { 'hide-internals': { 'tagToHide': 'hideit' } })
    });
    expect(res.parsed).toMatchInlineSnapshot(
    `
    openapi: 3.0.0
    components:
      parameters:
        x:
          name: x

    `);
  });

  it('should clean unused components', async () => {
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: makeConfig({}, {
        'hide-internals': { 'tagToHide': 'hideit' },
        'clear-unused-components': 'on'
      })
    });
    expect(res.parsed).toMatchInlineSnapshot(
    `
    openapi: 3.0.0

    `
    );
  });
});
