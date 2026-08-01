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
            { id: 'GET /tickets', title: 'GET /tickets' },
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
});

describe('limitIndexLevel', () => {
  it('prunes below the requested depth', () => {
    const limited = limitIndexLevel(INDEX, 1);
    expect(limited.structure.map((section) => section.id)).toEqual([
      'Overview',
      'Operations',
      'Webhooks',
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
