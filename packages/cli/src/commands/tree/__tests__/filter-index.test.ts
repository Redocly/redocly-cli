import type { ApiIndex } from '@redocly/openapi-core';

import { filterIndexByIds, filterIndexSections, limitIndexLevel } from '../filter-index.js';

const INDEX: ApiIndex = {
  docName: 'openapi.yaml',
  spec: 'oas3_0',
  structure: [
    { id: 'Overview', title: 'Overview' },
    {
      id: 'Operations',
      title: 'Operations',
      nodes: [
        {
          id: 'Tickets',
          title: 'Tickets',
          nodes: [
            // Shares its `file` with the schemas/Order leaf below on purpose: an operation must
            // never be kept by file alone, only a component leaf may be.
            {
              id: 'GET /tickets',
              title: 'GET /tickets',
              file: 'components/schemas/Order.yaml',
            },
            { id: 'POST /tickets', title: 'POST /tickets' },
          ],
        },
      ],
    },
    {
      id: 'Webhooks',
      title: 'Webhooks',
      nodes: [{ id: 'POST newTicket', title: 'POST newTicket' }],
    },
    {
      id: 'Components',
      title: 'Components',
      nodes: [
        {
          id: 'components/schemas',
          title: 'schemas',
          nodes: [{ id: 'schemas/Order', title: 'Order', file: 'components/schemas/Order.yaml' }],
        },
      ],
    },
  ],
};

describe('filterIndexByIds', () => {
  it('keeps ancestors of kept ids and drops the rest', () => {
    const filtered = filterIndexByIds(INDEX, new Set(['POST /tickets']));
    expect(filtered.structure.map((section) => section.id)).toEqual(['Operations']);
    expect(filtered.structure[0].nodes![0].nodes!.map((node) => node.id)).toEqual([
      'POST /tickets',
    ]);
  });

  it('keeps a split component leaf by its file id, and never keeps an operation by file alone', () => {
    const filtered = filterIndexByIds(INDEX, new Set(['components/schemas/Order.yaml']));
    // Only 'Components' survives: 'GET /tickets' shares the same file but isn't a component
    // leaf, so id-matching alone decides its fate, and 'components/schemas/Order.yaml' is not
    // its id.
    expect(filtered.structure.map((section) => section.id)).toEqual(['Components']);
    const schemas = filtered.structure[0].nodes!.find((node) => node.id === 'components/schemas')!;
    expect(schemas.nodes!.map((node) => node.id)).toEqual(['schemas/Order']);
  });

  it('does not keep an inline component leaf by file — the root document is not a split-out file', () => {
    const index: ApiIndex = {
      docName: 'openapi.yaml',
      spec: 'oas3_0',
      structure: [
        {
          id: 'Components',
          title: 'Components',
          nodes: [
            {
              id: 'components/schemas',
              title: 'schemas',
              nodes: [{ id: 'schemas/Pet', title: 'Pet', file: 'openapi.yaml' }],
            },
          ],
        },
      ],
    };
    // keepIds contains the root document's own id (the file every inline node shares), but not
    // 'schemas/Pet' itself — before the fix this kept every inline component unconditionally.
    const filtered = filterIndexByIds(index, new Set(['openapi.yaml']));
    expect(filtered.structure).toEqual([]);
  });
});

describe('limitIndexLevel', () => {
  it('prunes below the requested depth', () => {
    const limited = limitIndexLevel(INDEX, 1);
    expect(limited.structure.map((section) => section.id)).toEqual([
      'Overview',
      'Operations',
      'Webhooks',
      'Components',
    ]);
    expect(limited.structure[1].nodes).toBeUndefined();
  });
});

describe('filterIndexSections', () => {
  it('keeps only the named sections', () => {
    const filtered = filterIndexSections(INDEX, ['Operations', 'Webhooks']);
    expect(filtered.structure.map((section) => section.id)).toEqual(['Operations', 'Webhooks']);
  });
});
