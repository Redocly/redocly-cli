import { renderViewStylish } from '../print/views.js';

describe('renderViewStylish', () => {
  it('renders an operations listing grouped by path', () => {
    const rendered = renderViewStylish({
      kind: 'operations',
      scope: 'Tickets',
      items: [
        {
          method: 'post',
          path: '/tickets',
          operationId: 'buyTickets',
          summary: 'Buy museum tickets',
          tags: ['Tickets'],
          pointer: '#/post',
          file: 'paths/tickets.yaml',
          start_line: 10,
          end_line: 40,
        },
      ],
    });
    expect(rendered).toBe('/tickets\n  POST "Buy museum tickets" 10..40 [Tickets]');
  });

  it('adds the file to each line once a listing spans more than one file', () => {
    const rendered = renderViewStylish({
      kind: 'operations',
      items: [
        {
          method: 'get',
          path: '/tickets',
          summary: 'List tickets',
          tags: ['Tickets'],
          pointer: '#/get',
          file: 'paths/tickets.yaml',
          start_line: 1,
          end_line: 9,
        },
        {
          method: 'post',
          path: '/orders',
          summary: 'Create order',
          tags: ['Orders'],
          pointer: '#/post',
          file: 'paths/orders.yaml',
          start_line: 1,
          end_line: 9,
        },
      ],
    });
    expect(rendered).toContain('paths/tickets.yaml:1..9');
    expect(rendered).toContain('paths/orders.yaml:1..9');
  });

  it('renders an overview block', () => {
    const rendered = renderViewStylish({
      kind: 'overview',
      overview: {
        docName: 'openapi.yaml',
        spec: 'oas3_0',
        docDescription: 'Split API — Multi-file description.',
        servers: { urls: ['https://api.example.com/v1'] },
        tags: [{ name: 'Tickets', summary: 'Buy tickets.', operations: 2 }],
        operations: 2,
        webhooks: [],
        components: [{ section: 'schemas', count: 3 }],
      },
    });
    expect(rendered).toContain('Split API — Multi-file description.  (oas3_0)');
    expect(rendered).toContain('  Tickets (2) — Buy tickets.');
    expect(rendered).toContain('Components: schemas 3');
  });
});
