import outdent from 'outdent';
import * as path from 'path';

import { bundleDocument, bundle } from '../src/bundle';

import { parseYamlToDocument, yamlSerializer } from './utils';
import { LintConfig, Config, ResolvedConfig } from '../src/config';
import { BaseResolver } from '../src/resolve';

describe('bundle', () => {
  expect.addSnapshotSerializer(yamlSerializer);

  const testDocument = parseYamlToDocument(
    outdent`
      openapi: 3.0.0
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

  it('change nothing with only internal refs', async () => {
    const { bundle, problems } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: new LintConfig({}),
    });

    const origCopy = JSON.parse(JSON.stringify(testDocument.parsed));

    expect(problems).toHaveLength(0);
    expect(bundle.parsed).toEqual(origCopy);
  });

  it('should bundle external refs', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should bundle external refs and warn for conflicting names', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs-conflicting-names.yaml'),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toEqual(
      `Two schemas are referenced with the same name but different content. Renamed param-b to param-b-2.`,
    );
    expect(res.parsed).toMatchSnapshot();
  });

  it('should dereferenced correctly when used with dereference', async () => {
    const { bundle: res, problems } = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      config: new LintConfig({}),
      document: testDocument,
      dereference: true,
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should place referenced schema inline when referenced schema name resolves to original schema name', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      ref: path.join(__dirname, 'fixtures/refs/externalref.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should not place referened schema inline when component in question is not of type "schemas"', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      ref: path.join(__dirname, 'fixtures/refs/external-request-body.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should pull hosted schema', async () => {
    const fetchMock = jest.fn(
      () => Promise.resolve({
        ok: true,
        text: () => 'External schema content',
        headers: {
          get: () => ''
        }
      })
    );

    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      externalRefResolver: new BaseResolver({
        http: {
          customFetch: fetchMock,
          headers: []
        }
      }),
      ref: path.join(__dirname, 'fixtures/refs/hosted.yaml')
    });

    expect(problems).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://someexternal.schema",
      {
        headers: {}
      }
    );
    expect(res.parsed).toMatchSnapshot();
  })
});
