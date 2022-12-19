import outdent from 'outdent';
import * as path from 'path';

import { bundleDocument, bundle } from '../bundle';
import { parseYamlToDocument, yamlSerializer, makeConfig } from '../../__tests__/utils';
import { StyleguideConfig, Config, ResolvedConfig } from '../config';
import { BaseResolver } from '../resolve';

describe('bundle', () => {
  const fetchMock = jest.fn(() =>
    Promise.resolve({
      ok: true,
      text: () => 'External schema content',
      headers: {
        get: () => '',
      },
    })
  );

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
    ''
  );

  it('change nothing with only internal refs', async () => {
    const { bundle, problems } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: new StyleguideConfig({}),
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
      `Two schemas are referenced with the same name but different content. Renamed param-b to param-b-2.`
    );
    expect(res.parsed).toMatchSnapshot();
  });

  it('should dereferenced correctly when used with dereference', async () => {
    const { bundle: res, problems } = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      config: new StyleguideConfig({}),
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
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      externalRefResolver: new BaseResolver({
        http: {
          customFetch: fetchMock,
          headers: [],
        },
      }),
      ref: path.join(__dirname, 'fixtures/refs/hosted.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith('https://someexternal.schema', {
      headers: {},
    });
    expect(res.parsed).toMatchSnapshot();
  });

  it('should not bundle url refs if used with keepUrlRefs', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      externalRefResolver: new BaseResolver({
        http: {
          customFetch: fetchMock,
          headers: [],
        },
      }),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-url-refs.yaml'),
      keepUrlRefs: true,
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should add to meta ref from redocly registry', async () => {
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
                - $ref: 'https://api.redocly.com/registry/params'
        components:
          parameters:
            shared_a:
              name: shared-a
      `,
      ''
    );

    const config = await makeConfig({}, { 'registry-dependencies': 'on' });

    const {
      bundle: result,
      problems,
      ...meta
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver({
        http: {
          customFetch: fetchMock,
          headers: [],
        },
      }),
    });

    const parsedMeta = JSON.parse(JSON.stringify(meta));

    expect(problems).toHaveLength(0);
    expect(parsedMeta).toMatchSnapshot();
  });

  it('should bundle refs using $anchors', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            User:
              type: object
              properties:
                profile:
                  $ref: '#user-profile'
            UserProfile:
              $anchor: user-profile
              type: string
      `,
      ''
    );

    const config = await makeConfig({});

    const {
      bundle: { parsed },
      problems,
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver(),
    });

    expect(problems).toHaveLength(0);
    expect(parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      components:
        schemas:
          User:
            type: object
            properties:
              profile:
                $ref: '#user-profile'
          UserProfile:
            $anchor: user-profile
            type: string

    `);
  });
});
