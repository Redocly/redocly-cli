import { outdent } from 'outdent';

import {
  parseYamlToDocument,
  replaceSourceWithRef,
  yamlSerializer,
} from '../../../__tests__/utils.js';
import { BaseResolver, type Document } from '../../resolve.js';
import type { Overlay1Definition } from '../../typings/overlay.js';
import { applyOverlay } from '../apply-overlay.js';

// Tests pass overlays that are invalid on purpose, so the parsed content isn't checked here.
const parseOverlay = (body: string, absoluteRef: string) =>
  parseYamlToDocument(body, absoluteRef) as Document<Overlay1Definition>;

const document = outdent`
  openapi: 3.1.0
  info:
    title: Museum API
    version: 1.0.0
  tags:
    - name: tickets
  paths:
    /tickets:
      get:
        tags: [tickets]
        parameters:
          - name: limit
            in: query
          - name: dummy
            in: query
          - name: page
            in: query
      post:
        tags: [tickets, internal]
    /it's-internal:
      get:
        summary: Internal
`;

function apply(actions: string) {
  const target = parseYamlToDocument(document, 'openapi.yaml');
  const overlay = parseOverlay(
    outdent`
      overlay: 1.1.0
      info:
        title: Test overlay
        version: 1.0.0
      actions:
      ${actions}
    `,
    'overlay.yaml'
  );
  const problems = applyOverlay(target, overlay, new BaseResolver());
  return { parsed: target.parsed, problems: replaceSourceWithRef(problems) };
}

describe('applyOverlay', () => {
  expect.addSnapshotSerializer(yamlSerializer);

  it('merges an update into the selected objects', () => {
    const { parsed, problems } = apply(outdent`
      - target: $.paths['/tickets'].get
        update:
          summary: List tickets
          tags: [public]
          parameters:
            - name: sort
              in: query
          x-meta:
            nested: true
    `);

    expect(problems).toEqual([]);
    expect(parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      info:
        title: Museum API
        version: 1.0.0
      tags:
        - name: tickets
      paths:
        /tickets:
          get:
            tags:
              - tickets
              - public
            parameters:
              - name: limit
                in: query
              - name: dummy
                in: query
              - name: page
                in: query
              - name: sort
                in: query
            summary: List tickets
            x-meta:
              nested: true
          post:
            tags:
              - tickets
              - internal
        /it's-internal:
          get:
            summary: Internal

    `);
  });

  it('appends to the selected arrays and replaces the selected primitives', () => {
    const { parsed, problems } = apply(outdent`
      - target: $.tags
        update:
          name: museum
      - target: $.paths.*.post.tags
        update: [admin, beta]
      - target: $.info.title
        update: Public Museum API
    `);

    expect(problems).toEqual([]);
    expect(parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      info:
        title: Public Museum API
        version: 1.0.0
      tags:
        - name: tickets
        - name: museum
      paths:
        /tickets:
          get:
            tags:
              - tickets
            parameters:
              - name: limit
                in: query
              - name: dummy
                in: query
              - name: page
                in: query
          post:
            tags:
              - tickets
              - internal
              - admin
              - beta
        /it's-internal:
          get:
            summary: Internal

    `);
  });

  it('removes the selected nodes from objects and arrays', () => {
    const { parsed, problems } = apply(outdent`
      - target: $.paths['/tickets'].get.parameters[?@.name != 'limit']
        remove: true
      - target: $.paths.*.post.tags[?@ == 'internal']
        remove: true
      - target: $.paths["/it's-internal"]
        remove: true
    `);

    expect(problems).toEqual([]);
    expect(parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      info:
        title: Museum API
        version: 1.0.0
      tags:
        - name: tickets
      paths:
        /tickets:
          get:
            tags:
              - tickets
            parameters:
              - name: limit
                in: query
          post:
            tags:
              - tickets

    `);
  });

  it('applies actions in order, so update, copy, and remove can move a node', () => {
    const { parsed, problems } = apply(outdent`
      - target: $.paths
        update:
          /public-tickets: {}
      - target: $.paths['/public-tickets']
        copy: $.paths['/tickets']
      - target: $.paths['/tickets']
        remove: true
    `);

    expect(problems).toEqual([]);
    expect(parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      info:
        title: Museum API
        version: 1.0.0
      tags:
        - name: tickets
      paths:
        /it's-internal:
          get:
            summary: Internal
        /public-tickets:
          get:
            tags:
              - tickets
            parameters:
              - name: limit
                in: query
              - name: dummy
                in: query
              - name: page
                in: query
          post:
            tags:
              - tickets
              - internal

    `);
  });

  it('changes only the selected location when one object sits at several paths', () => {
    // Bundling inlines a file referenced from two places as one shared object.
    const target = parseYamlToDocument(document, 'openapi.yaml');
    const parsed = target.parsed as { paths: Record<string, unknown> };
    parsed.paths['/tickets-alias'] = parsed.paths['/tickets'];
    const overlay = parseOverlay(
      outdent`
        overlay: 1.0.0
        info:
          title: Test overlay
          version: 1.0.0
        actions:
          - target: $.paths['/tickets'].get
            update:
              tags: [public]
          - target: $.paths['/tickets'].get.parameters[0].name
            update: max
          - target: $.paths['/tickets'].post.tags[?@ == 'internal']
            remove: true
      `,
      'overlay.yaml'
    );

    expect(applyOverlay(target, overlay, new BaseResolver())).toEqual([]);
    expect(parsed.paths['/tickets-alias']).toEqual(
      (parseYamlToDocument(document).parsed as { paths: Record<string, unknown> }).paths['/tickets']
    );
    expect(parsed.paths['/tickets']).toMatchInlineSnapshot(`
      get:
        tags:
          - tickets
          - public
        parameters:
          - name: max
            in: query
          - name: dummy
            in: query
          - name: page
            in: query
      post:
        tags:
          - tickets

    `);
  });

  it('applies reusable actions from components', () => {
    const target = parseYamlToDocument(document, 'openapi.yaml');
    const overlay = parseOverlay(
      outdent`
        overlay: 1.2.0
        info:
          title: Test overlay
          version: 1.0.0
        components:
          actions:
            internal:
              fields:
                update:
                  x-internal: true
        actions:
          - $ref: '#/components/actions/internal'
            target: $.paths['/tickets'].post
          - $ref: '#/components/actions/internal'
            target: $.paths["/it's-internal"].get
      `,
      'overlay.yaml'
    );

    expect(applyOverlay(target, overlay, new BaseResolver())).toEqual([]);
    expect((target.parsed as { paths: unknown }).paths).toMatchInlineSnapshot(`
      /tickets:
        get:
          tags:
            - tickets
          parameters:
            - name: limit
              in: query
            - name: dummy
              in: query
            - name: page
              in: query
        post:
          tags:
            - tickets
            - internal
          x-internal: true
      /it's-internal:
        get:
          summary: Internal
          x-internal: true

    `);
  });

  it('makes file references in overlay values relative to the document', () => {
    const update = outdent`
      update:
        responses:
          '200':
            $ref: ./responses/Ok.yaml#/Ok
          '404':
            $ref: '#/components/responses/NotFound'
    `;
    const apply = (overlayHeader: string) => {
      const target = parseYamlToDocument(document, '/project/openapi.yaml');
      const overlay = parseOverlay(
        `${overlayHeader}\nactions:\n  - target: $.paths['/tickets'].get\n${update.replace(/^/gm, '    ')}`,
        '/project/overlays/public.yaml'
      );
      expect(applyOverlay(target, overlay, new BaseResolver())).toEqual([]);
      return (target.parsed as any).paths['/tickets'].get.responses;
    };

    expect(apply('overlay: 1.1.0\ninfo: { title: T, version: 1.0.0 }')).toEqual({
      '200': { $ref: 'overlays/responses/Ok.yaml#/Ok' },
      '404': { $ref: '#/components/responses/NotFound' },
    });
    expect(
      apply(
        'overlay: 1.2.0\n$self: https://example.com/overlays/public.yaml\ninfo: { title: T, version: 1.0.0 }'
      )
    ).toEqual({
      '200': { $ref: 'https://example.com/overlays/responses/Ok.yaml#/Ok' },
      '404': { $ref: '#/components/responses/NotFound' },
    });
  });

  it('reports an actions field that is not a list', () => {
    const target = parseYamlToDocument(document, 'openapi.yaml');
    const overlay = parseOverlay(
      outdent`
        overlay: 1.1.0
        info:
          title: Test overlay
          version: 1.0.0
        actions:
          target: $.info
      `,
      'overlay.yaml'
    );

    expect(applyOverlay(target, overlay, new BaseResolver()).map(({ message }) => message)).toEqual(
      ['The `actions` field must be a list.']
    );
  });

  it('reports actions that cannot be applied', () => {
    const { problems } = apply(outdent`
      - target: $.paths[
        update:
          summary: Invalid target
      - target: $.info.title
        update:
          text: Objects cannot replace strings
      - target: $.paths['/tickets'].get
        update:
          tags:
            name: Objects cannot merge into arrays
      - target: $.paths['/tickets'].get
        copy: $.paths.*.get
      - target: $
        remove: true
      - description: Missing target
        remove: true
      - target: $.info
        update:
          title: Both update and copy
        copy: $.paths['/tickets']
      - $ref: '#/components/actions/missing'
        target: $.info
      - Not an action
    `);

    expect(problems).toMatchInlineSnapshot(`
      - ruleId: overlay
        severity: error
        message: >-
          Invalid JSONPath expression: Expected "'", "*", "-", "0", ":", "?", "\\"",
          [1-9], or [\\t-\\n\\r ] but end of input found.
        location:
          - source: overlay.yaml
            pointer: '#/actions/0/target'
            reportOnKey: false
        suggest: []
      - ruleId: overlay
        severity: error
        message: Cannot apply object to string at $['info']['title'].
        location:
          - source: overlay.yaml
            pointer: '#/actions/1/update'
            reportOnKey: false
        suggest: []
      - ruleId: overlay
        severity: error
        message: Cannot apply object to array at $['paths']['/tickets']['get']['tags'].
        location:
          - source: overlay.yaml
            pointer: '#/actions/2/update'
            reportOnKey: false
        suggest: []
      - ruleId: overlay
        severity: error
        message: The copy expression must select exactly one node, but it selected 2.
        location:
          - source: overlay.yaml
            pointer: '#/actions/3/copy'
            reportOnKey: false
        suggest: []
      - ruleId: overlay
        severity: error
        message: Cannot remove the root of the document.
        location:
          - source: overlay.yaml
            pointer: '#/actions/4/target'
            reportOnKey: false
        suggest: []
      - ruleId: overlay
        severity: error
        message: The \`target\` field must be a JSONPath expression.
        location:
          - source: overlay.yaml
            pointer: '#/actions/5/target'
            reportOnKey: false
        suggest: []
      - ruleId: overlay
        severity: error
        message: An action can't have both \`update\` and \`copy\`.
        location:
          - source: overlay.yaml
            pointer: '#/actions/6'
            reportOnKey: false
        suggest: []
      - ruleId: overlay
        severity: error
        message: Can't find the reusable action \`#/components/actions/missing\`.
        location:
          - source: overlay.yaml
            pointer: '#/actions/7/$ref'
            reportOnKey: false
        suggest: []
      - ruleId: overlay
        severity: error
        message: An action must be an object.
        location:
          - source: overlay.yaml
            pointer: '#/actions/8'
            reportOnKey: false
        suggest: []
    `);
  });
});
