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

  it('renders an overview block', () => {
    const rendered = renderViewStylish({
      kind: 'overview',
      overview: {
        docName: 'openapi.yaml',
        spec: 'oas3_0',
        docDescription: 'Split API — Multi-file description.',
        servers: { urls: ['https://api.example.com/v1'] },
        tags: [{ name: 'Tickets', summary: 'Buy tickets.', operations: 2 }],
        webhooks: 0,
        components: [{ section: 'schemas', count: 3 }],
      },
    });
    expect(rendered).toContain('Split API — Multi-file description.  (oas3_0)');
    expect(rendered).toContain('  Tickets (2) — Buy tickets.');
    expect(rendered).toContain('Components: schemas 3');
  });
});
