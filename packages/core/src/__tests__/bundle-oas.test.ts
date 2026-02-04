import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import outdent from 'outdent';

import { parseYamlToDocument, yamlSerializer } from '../../__tests__/utils.js';
import { bundleOas, createEmptyRedoclyConfig } from '../bundle/bundle-oas.js';
import { BaseResolver } from '../resolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const stringDocument = outdent`
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
`;

const testDocument = parseYamlToDocument(stringDocument, '');

describe('bundle-oas', () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: true,
      text: () => 'External schema content',
      headers: {
        get: () => '',
      },
    })
  );

  expect.addSnapshotSerializer(yamlSerializer);

  it('should bundle external refs', async () => {
    const { bundle: res, problems } = await bundleOas({
      config: await createEmptyRedoclyConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should bundle external refs and warn for conflicting names', async () => {
    const { bundle: res, problems } = await bundleOas({
      config: await createEmptyRedoclyConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs-conflicting-names.yaml'),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toEqual(
      `Two schemas are referenced with the same name but different content. Renamed param-b to param-b-2.`
    );
    expect(res.parsed).toMatchSnapshot();
  });

  it('should place referenced schema inline when referenced schema name resolves to original schema name', async () => {
    const { bundle: res, problems } = await bundleOas({
      config: await createEmptyRedoclyConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/externalref.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should not place referenced schema inline when component in question is not of type "schemas"', async () => {
    const { bundle: res, problems } = await bundleOas({
      config: await createEmptyRedoclyConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/external-request-body.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should pull hosted schema', async () => {
    const { bundle: res, problems } = await bundleOas({
      config: await createEmptyRedoclyConfig({}),
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
    const { bundle: res, problems } = await bundleOas({
      config: await createEmptyRedoclyConfig({}),
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

  it('should throw an error when there is no document to bundle', async () => {
    const config = await createEmptyRedoclyConfig({});
    const wrapper = () =>
      bundleOas({
        config,
      });

    expect(wrapper()).rejects.toThrowError('Document or reference is required.\n');
  });

  it('should bundle with a doc provided', async () => {
    const {
      bundle: { parsed },
      problems,
    } = await bundleOas({
      config: await createEmptyRedoclyConfig({
        configPath: path.join(__dirname, 'fixtures/redocly.yaml'),
      }),
      doc: testDocument,
    });

    const origCopy = JSON.parse(JSON.stringify(testDocument.parsed));

    expect(problems).toHaveLength(0);
    expect(parsed).toEqual(origCopy);
  });

  it('should bundle schemas with properties named $ref and externalValues correctly', async () => {
    const { bundle: res, problems } = await bundleOas({
      config: await createEmptyRedoclyConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-special-names-in-props.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should normalize self-file explicit $ref in oas2', async () => {
    const { bundle: res, problems } = await bundleOas({
      config: await createEmptyRedoclyConfig({}),
      ref: path.join(__dirname, 'fixtures/self-file-refs/oas2.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should normalize self-file explicit $ref in nested referenced file', async () => {
    const config = await createEmptyRedoclyConfig({});

    const { bundle: res, problems } = await bundleOas({
      config,
      ref: path.join(__dirname, 'fixtures/self-file-refs/oas3-root.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });
});
