import { renderView, renderViewStylish } from '../print/views.js';

describe('renderViewStylish', () => {
  it('renders an operations listing grouped by path, with tree glyphs', () => {
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
          refs: [],
          usedBy: [],
        },
      ],
    });
    expect(rendered).toBe('/tickets (1)\n└── POST "Buy museum tickets" 10..40 [Tickets]');
  });

  it('adds the file to each entry once a listing spans more than one file', () => {
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
          refs: [],
          usedBy: [],
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
          refs: [],
          usedBy: [],
        },
      ],
    });
    expect(rendered).toBe(
      [
        '/tickets (1)',
        '└── GET "List tickets" paths/tickets.yaml:1..9 [Tickets]',
        '',
        '/orders (1)',
        '└── POST "Create order" paths/orders.yaml:1..9 [Orders]',
      ].join('\n')
    );
  });

  it('renders a component listing with tree glyphs', () => {
    const rendered = renderViewStylish({
      kind: 'components',
      section: 'schemas',
      items: [
        {
          component: 'schemas',
          name: 'Ticket',
          summary: 'A museum ticket.',
          pointer: '#/components/schemas/Ticket',
          file: 'openapi.yaml',
          start_line: 12,
          end_line: 20,
          refs: [],
          usedBy: [],
        },
        {
          component: 'schemas',
          name: 'Order',
          pointer: '#/components/schemas/Order',
          file: 'openapi.yaml',
          start_line: 22,
          end_line: 30,
          refs: [],
          usedBy: [],
        },
      ],
    });
    expect(rendered).toBe(
      ['schemas (2)', '├── Ticket "A museum ticket." 12..20', '└── Order 22..30'].join('\n')
    );
  });

  it('renders the overview as a top-level tree, cut at the branch level', () => {
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
    expect(rendered).toBe(
      [
        'openapi.yaml — Split API — Multi-file description.  (oas3_0)',
        '├── Servers',
        '│   └── https://api.example.com/v1',
        '├── Operations (2)',
        '│   └── Tickets (2) — Buy tickets.',
        '└── Components (3)',
        '    └── schemas (3)',
      ].join('\n')
    );
  });

  it('adds a Webhooks branch by name and omits empty sections', () => {
    const rendered = renderViewStylish({
      kind: 'overview',
      overview: {
        docName: 'webhooks.yaml',
        spec: 'oas3_1',
        tags: [],
        operations: 0,
        webhooks: [{ name: 'newTicket', operations: 1 }],
        components: [],
      },
    });
    expect(rendered).toBe('webhooks.yaml  (oas3_1)\n└── Webhooks (1)\n    └── newTicket');
  });

  it('renders an operation card with refs and usedBy as tree branches', () => {
    const rendered = renderViewStylish({
      kind: 'operation-card',
      card: {
        method: 'post',
        path: '/tickets',
        operationId: 'buyTickets',
        summary: 'Buy museum tickets',
        tags: ['Tickets'],
        pointer: '#/post',
        file: 'paths/tickets.yaml',
        start_line: 10,
        end_line: 40,
        refs: [
          {
            ref: '#/components/schemas/Ticket',
            resolved: true,
            component: 'schemas',
            name: 'Ticket',
            file: 'openapi.yaml',
            pointer: '#/components/schemas/Ticket',
            start_line: 1,
            end_line: 5,
          },
        ],
        usedBy: [
          {
            id: 'schemas/Order',
            component: 'schemas',
            name: 'Order',
            pointer: '#/components/schemas/Order',
            file: 'openapi.yaml',
            start_line: 50,
            end_line: 60,
          },
        ],
      },
    });
    expect(rendered).toBe(
      [
        'POST /tickets (buyTickets)',
        'file: paths/tickets.yaml#/post',
        'lines: 10..40',
        'summary: Buy museum tickets',
        'refs:',
        '└── schemas/Ticket  #/components/schemas/Ticket  1..5',
        'usedBy:',
        '└── schemas/Order  #/components/schemas/Order  50..60',
      ].join('\n')
    );
  });

  it('renders the --with-deps closure after the card block: raw content, then a deps tree', () => {
    const rendered = renderViewStylish({
      kind: 'component-card',
      card: {
        component: 'schemas',
        name: 'Ticket',
        pointer: '#/components/schemas/Ticket',
        file: 'openapi.yaml',
        start_line: 1,
        end_line: 5,
        refs: [],
        usedBy: [],
        content: 'Ticket:\n  type: object',
        deps: [
          {
            id: 'schemas/TicketId',
            file: 'openapi.yaml',
            start_line: 6,
            end_line: 7,
            content: 'TicketId:\n  type: string',
            refs: [],
          },
        ],
      },
    });
    expect(rendered).toBe(
      [
        'schemas/Ticket',
        'file: openapi.yaml#/components/schemas/Ticket',
        'lines: 1..5',
        'usedBy: (none)',
        '',
        'content:',
        '  Ticket:',
        '    type: object',
        '',
        'deps:',
        '└── schemas/TicketId  openapi.yaml:6..7',
      ].join('\n')
    );
  });

  it('marks a truncated deps closure', () => {
    const rendered = renderViewStylish({
      kind: 'operation-card',
      card: {
        method: 'get',
        path: '/tickets',
        tags: [],
        pointer: '#/get',
        file: 'openapi.yaml',
        start_line: 1,
        end_line: 2,
        refs: [],
        usedBy: [],
        content: 'get: {}',
        deps: [],
        truncated: true,
      },
    });
    expect(rendered).toContain('deps: (truncated)');
  });

  it('renders a file card with its defines as tree branches', () => {
    const rendered = renderViewStylish({
      kind: 'file-card',
      card: {
        file: 'paths/tickets.yaml',
        defines: [
          {
            method: 'get',
            path: '/tickets',
            operationId: 'listTickets',
            summary: 'List tickets',
            tags: ['Tickets'],
            pointer: '#/get',
            file: 'paths/tickets.yaml',
            start_line: 1,
            end_line: 9,
            refs: [],
            usedBy: [],
          },
          {
            component: 'schemas',
            name: 'Ticket',
            pointer: '#/',
            file: 'paths/tickets.yaml',
            start_line: 11,
            end_line: 15,
            refs: [],
            usedBy: [],
          },
        ],
      },
    });
    expect(rendered).toBe(
      [
        'paths/tickets.yaml',
        '├── GET /tickets "List tickets" 1..9 [Tickets]',
        '└── schemas/Ticket 11..15',
      ].join('\n')
    );
  });

  it('renders a used-by report with affected operations and components as tree branches', () => {
    const rendered = renderViewStylish({
      kind: 'used-by',
      report: {
        target: {
          id: 'schemas/Ticket',
          component: 'schemas',
          name: 'Ticket',
          file: 'openapi.yaml',
          pointer: '#/components/schemas/Ticket',
          start_line: 1,
          end_line: 5,
        },
        affectedOperations: [
          {
            id: 'POST /tickets',
            method: 'post',
            path: '/tickets',
            file: 'paths/tickets.yaml',
            pointer: '#/post',
            start_line: 10,
            end_line: 40,
            via: ['schemas/Ticket', 'POST /tickets'],
          },
        ],
        affectedComponents: [],
      },
    });
    expect(rendered).toBe(
      [
        'schemas/Ticket  #/components/schemas/Ticket  1..5',
        '└── Affected operations (1)',
        '    └── POST /tickets  #/post  10..40',
      ].join('\n')
    );
  });

  it('reports when nothing references the used-by target', () => {
    const rendered = renderViewStylish({
      kind: 'used-by',
      report: {
        target: { id: 'paths/orphan.yaml', file: 'paths/orphan.yaml' },
        affectedOperations: [],
        affectedComponents: [],
      },
    });
    expect(rendered).toBe('paths/orphan.yaml\nNothing references it.');
  });
});

describe('renderView (json)', () => {
  it('keeps refs and usedBy in the json payload for a card-shaped listing', () => {
    const json = renderView(
      {
        kind: 'operations',
        items: [
          {
            method: 'post',
            path: '/tickets',
            tags: ['Tickets'],
            pointer: '#/post',
            file: 'paths/tickets.yaml',
            start_line: 10,
            end_line: 40,
            refs: [
              {
                ref: '#/components/schemas/Ticket',
                resolved: true,
                component: 'schemas',
                name: 'Ticket',
                file: 'openapi.yaml',
                pointer: '#/components/schemas/Ticket',
                start_line: 1,
                end_line: 5,
              },
            ],
            usedBy: [],
          },
        ],
      },
      'json'
    );
    expect(JSON.parse(json)[0]).toMatchObject({
      refs: [{ component: 'schemas', name: 'Ticket' }],
      usedBy: [],
    });
  });
});
