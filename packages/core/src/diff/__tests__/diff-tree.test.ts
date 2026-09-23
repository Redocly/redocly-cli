import { outdent } from 'outdent';

import { createConfig } from '../../config/index.js';
import { detectSpec } from '../../detect-spec.js';
import { buildNodeTree } from '../../node-tree/build.js';
import { getTypes } from '../../oas-types.js';
import { makeDocumentFromString } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { buildDiffTree } from '../diff-tree.js';
import { oas3Identities } from '../specs/oas3.js';
import type { DiffNode } from '../types.js';

async function nodesOf(yaml: string) {
  const document = makeDocumentFromString(yaml, 'api.yaml');
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  return buildNodeTree({ document, types, specVersion }).root;
}

/** Every node's key, the document compared with itself. */
async function labelsOf(yaml: string): Promise<Map<string, DiffNode>> {
  const root = await nodesOf(yaml);
  const labels = new Map<string, DiffNode>();
  const visit = (node: DiffNode) => {
    labels.set(node.key, node);
    node.children.forEach(visit);
  };
  visit(buildDiffTree(root, root, oas3Identities).root);
  return labels;
}

describe('buildDiffTree', () => {
  it('labels a path by its shape and its path parameters by position', async () => {
    const labels = await labelsOf(outdent`
      openapi: 3.1.0
      info: { title: T, version: '1' }
      paths:
        /pets/{petId}/toys/{toyId}:
          get:
            parameters:
              - { name: toyId, in: path, required: true, schema: { type: string } }
              - { name: petId, in: path, required: true, schema: { type: string } }
              - { name: q, in: query, schema: { type: string } }
            responses: {}
    `);

    expect(labels.get('#/paths/~1pets~1{0}~1toys~1{1}')?.base?.key).toBe(
      '/pets/{petId}/toys/{toyId}'
    );
    expect(
      [...labels.keys()].filter((key) => key.includes('parameters/') && !key.endsWith('/schema'))
    ).toEqual([
      '#/paths/~1pets~1{0}~1toys~1{1}/get/parameters/{path:1}',
      '#/paths/~1pets~1{0}~1toys~1{1}/get/parameters/{path:0}',
      '#/paths/~1pets~1{0}~1toys~1{1}/get/parameters/{query:q}',
    ]);
  });

  it('keeps a callback key as it is and falls back to the parameter name there', async () => {
    const labels = await labelsOf(outdent`
      openapi: 3.1.0
      info: { title: T, version: '1' }
      paths:
        /subscribe:
          post:
            responses: {}
            callbacks:
              onEvent:
                '{$request.body#/url}':
                  post:
                    parameters:
                      - { name: id, in: path, required: true, schema: { type: string } }
                    responses: {}
    `);

    expect(labels.has('#/paths/~1subscribe/post/callbacks/onEvent/{$request.body#~1url}')).toBe(
      true
    );
    expect(
      labels.has(
        '#/paths/~1subscribe/post/callbacks/onEvent/{$request.body#~1url}/post/parameters/{path:id}'
      )
    ).toBe(true);
  });

  it('labels servers by url, tags by name, and security requirements by their scheme names', async () => {
    const labels = await labelsOf(outdent`
      openapi: 3.1.0
      info: { title: T, version: '1' }
      servers:
        - url: https://a.example/v1
      tags:
        - name: pets
      security:
        - oauth: [read]
          apiKey: []
      paths: {}
    `);

    expect(labels.has('#/servers/{https:~1~1a.example~1v1}')).toBe(true);
    expect(labels.has('#/tags/{pets}')).toBe(true);
    expect(labels.has('#/security/{apiKey+oauth}')).toBe(true);
  });

  it('matches siblings with the same identity in order and numbers the label from the second one', async () => {
    const yaml = (second: string) => outdent`
      openapi: 3.1.0
      info: { title: T, version: '1' }
      paths:
        /p:
          get:
            parameters:
              - { name: a, in: query }
              ${second}
            responses: {}
    `;
    const base = await nodesOf(yaml('- { name: a, in: query, required: true }'));
    const revision = await nodesOf(yaml(''));

    const list = buildDiffTree(base, revision, oas3Identities)
      .root.children.flatMap((node) => node.children)
      .flatMap((node) => node.children)
      .flatMap((node) => node.children)
      .find((node) => node.base?.type === 'ParameterList')!;

    expect(list.children.map((node) => [node.key, node.base?.key, node.revision?.key])).toEqual([
      ['#/paths/~1p/get/parameters/{query:a}', 0, 0],
      ['#/paths/~1p/get/parameters/{query:a}#2', 1, undefined],
    ]);
  });
});
