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

  it('matches component leaves by their semantic id for split and inline alike', () => {
    // Graph and index share the id space (split aliases keep `section/Name` ids in the graph),
    // so a keep-set of graph ids prunes the index without any file-based fallback.
    const filtered = filterIndexByIds(INDEX, new Set(['schemas/Order']));
    expect(filtered.structure.map((section) => section.id)).toEqual(['Components']);
    const schemas = filtered.structure[0].nodes!.find((node) => node.id === 'components/schemas')!;
    expect(schemas.nodes!.map((node) => node.id)).toEqual(['schemas/Order']);
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
