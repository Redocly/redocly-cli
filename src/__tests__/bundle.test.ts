import outdent from 'outdent';
import * as path from 'path';

import { bundleDocument, bundle } from '../bundle';

import { parseYamlToDocument, yamlSerializer } from './utils';
import { LintConfig, Config } from '../config/config';
import { BaseResolver } from '../resolve';

describe('bundle', () => {
  expect.addSnapshotSerializer(yamlSerializer);

  it('change nothing with only internal refs', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          contact: {}
          license: {}
        paths:
          /pet:
            get:
              operationId: get
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
            post:
              operationId: post
              parameters:
                - $ref: '#/components/parameters/shared_a'
        components:
          parameters:
            shared_a:
              name: shared-a
      `,
      '',
    );

    const { bundle, messages } = await bundleDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: new LintConfig({}),
    });

    const origCopy = JSON.parse(JSON.stringify(document.parsed));

    expect(messages).toHaveLength(0);
    expect(bundle).toEqual(origCopy);
  });

  it('should bundle external refs', async () => {
    const { bundle: res, messages } = await bundle({
      config: new Config({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs.yaml'),
    });
    expect(messages).toHaveLength(0);
    expect(res).toMatchSnapshot();
  });

  it('should bundle external refs and warn for conflicting names', async () => {
    const { bundle: res, messages } = await bundle({
      config: new Config({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs-conflicting-names.yaml'),
    });
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toEqual(
      `Two schemas are referenced with the same name but different content. Renamed param-b to param-b-2.`,
    );
    expect(res).toMatchSnapshot();
  });
});
