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

  it('renders the overview as a top-level tree, expanded down to operations', () => {
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
      operations: [
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
      ],
    });
    expect(rendered).toBe(
      [
        'openapi.yaml — Split API — Multi-file description.  (oas3_0)',
        '├── Servers',
        '│   └── https://api.example.com/v1',
        '├── Operations (2)',
        '│   └── Tickets (2) — Buy tickets.',
        '│       ├── POST /tickets — Buy museum tickets (buyTickets)  [10..40]',
        '│       └── GET /tickets — List tickets  [1..9]',
        '└── Components (3)',
        '    └── schemas (3)',
      ].join('\n')
    );
  });

  it('collapses the overview to tag counts and hints at --tag when no operations are handed in', () => {
    const rendered = renderViewStylish({
      kind: 'overview',
      overview: {
        docName: 'openapi.yaml',
        spec: 'oas3_0',
        servers: { urls: ['https://api.example.com/v1'] },
        tags: [{ name: 'Tickets', summary: 'Buy tickets.', operations: 150 }],
        operations: 150,
        webhooks: [],
        components: [{ section: 'schemas', count: 3 }],
      },
    });
    expect(rendered).toBe(
      [
        'openapi.yaml  (oas3_0)',
        '├── Servers',
        '│   └── https://api.example.com/v1',
        '├── Operations (150)',
        '│   └── Tickets (150) — Buy tickets.',
        '└── Components (3)',
        '    └── schemas (3)',
        '',
        '150 operations across 1 tags — expand one with `--tag=<name>`.',
      ].join('\n')
    );
  });

  it('lists a multi-tag operation under each of its tags in the overview tree', () => {
    const rendered = renderViewStylish({
      kind: 'overview',
      overview: {
        docName: 'openapi.yaml',
        spec: 'oas3_0',
        tags: [
          { name: 'Tickets', operations: 1 },
          { name: 'Orders', operations: 1 },
        ],
        operations: 1,
        webhooks: [],
        components: [],
      },
      operations: [
        {
          method: 'post',
          path: '/tickets',
          summary: 'Buy museum tickets',
          tags: ['Tickets', 'Orders'],
          pointer: '#/post',
          file: 'openapi.yaml',
          start_line: 10,
          end_line: 40,
          refs: [],
          usedBy: [],
        },
      ],
    });
    expect(rendered).toBe(
      [
        'openapi.yaml  (oas3_0)',
        '└── Operations (1)',
        '    ├── Tickets (1)',
        '    │   └── POST /tickets — Buy museum tickets  [10..40]',
        '    └── Orders (1)',
        '        └── POST /tickets — Buy museum tickets  [10..40]',
      ].join('\n')
    );
  });

  it('adds a Webhooks branch by name, expanded to its operations, and omits empty sections', () => {
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
      webhookOperations: [
        {
          method: 'post',
          webhook: 'newTicket',
          summary: 'New ticket alert',
          tags: [],
          pointer: '#/post',
          file: 'webhooks.yaml',
          start_line: 8,
          end_line: 12,
          refs: [],
          usedBy: [],
        },
      ],
    });
    expect(rendered).toBe(
      [
        'webhooks.yaml  (oas3_1)',
        '└── Webhooks (1)',
        '    └── newTicket',
        '        └── POST — New ticket alert  [8..12]',
      ].join('\n')
    );
  });

  it('renders an operation card as a pure glyph tree, with refs and usedBy as branches', () => {
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
        'POST /tickets — Buy museum tickets (buyTickets)',
        '├── source: paths/tickets.yaml#/post  [10..40]',
        '├── refs (1)',
        '│   └── schemas/Ticket → openapi.yaml#/components/schemas/Ticket  [1..5]',
        '└── usedBy (1)',
        '    └── schemas/Order → openapi.yaml  [50..60]',
      ].join('\n')
    );
  });

  it('renders a webhook operation card header with the webhook name in place of a path', () => {
    const rendered = renderViewStylish({
      kind: 'operation-card',
      card: {
        method: 'post',
        webhook: 'newTicket',
        operationId: 'newTicketAlert',
        summary: 'New ticket alert',
        tags: [],
        pointer: '#/post',
        file: 'webhooks.yaml',
        start_line: 8,
        end_line: 12,
        refs: [],
        usedBy: [],
      },
    });
    expect(rendered).toBe(
      [
        'POST newTicket — New ticket alert (newTicketAlert)',
        '├── source: webhooks.yaml#/post  [8..12]',
        '└── usedBy (none)',
      ].join('\n')
    );
  });

  it('renders unresolved and non-component refs in the refs branch', () => {
    const rendered = renderViewStylish({
      kind: 'operation-card',
      card: {
        method: 'get',
        path: '/items',
        tags: [],
        pointer: '#/get',
        file: 'openapi.yaml',
        start_line: 1,
        end_line: 5,
        refs: [
          { ref: './schemas/Item.yaml', resolved: false, component: 'unknown' },
          {
            ref: '../paths/legacy.yaml',
            resolved: true,
            component: 'unknown',
            file: 'paths/legacy.yaml',
            pointer: '#/',
            start_line: 1,
            end_line: 3,
          },
        ],
        usedBy: [],
      },
    });
    expect(rendered).toBe(
      [
        'GET /items',
        '├── source: openapi.yaml#/get  [1..5]',
        '├── refs (2)',
        '│   ├── ./schemas/Item.yaml (unresolved)',
        '│   └── ../paths/legacy.yaml → paths/legacy.yaml  [1..3]',
        '└── usedBy (none)',
      ].join('\n')
    );
  });

  it('renders a with-deps closure as a deps branch, sized against the cap', () => {
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
            content: 'x'.repeat(2048),
            refs: [],
          },
        ],
      },
    });
    expect(rendered).toBe(
      [
        'schemas/Ticket',
        '├── source: openapi.yaml#/components/schemas/Ticket  [1..5]',
        '├── usedBy (none)',
        '└── deps (1, 2.0 KB of 64 KB cap)',
        '    └── schemas/TicketId → openapi.yaml  [6..7]',
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
    expect(rendered).toContain('deps (0, 0.0 KB of 64 KB cap) (truncated)');
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
        '├── GET /tickets — List tickets (listTickets)  [1..9]',
        '└── schemas/Ticket  [11..15]',
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

describe('renderView (ai)', () => {
  it('projects a listing to compact entries, adding file only once the listing spans more than one file, and serializes without indentation', () => {
    const json = renderView(
      {
        kind: 'operations',
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
          {
            method: 'get',
            path: '/orders',
            summary: 'List orders',
            tags: ['Orders'],
            pointer: '#/get',
            file: 'paths/orders.yaml',
            start_line: 1,
            end_line: 9,
            refs: [],
            usedBy: [],
          },
        ],
      },
      'ai'
    );
    expect(json).not.toContain('\n');
    expect(JSON.parse(json)).toEqual([
      {
        method: 'post',
        path: '/tickets',
        operationId: 'buyTickets',
        summary: 'Buy museum tickets',
        lines: [10, 40],
        file: 'paths/tickets.yaml',
      },
      {
        method: 'get',
        path: '/orders',
        summary: 'List orders',
        lines: [1, 9],
        file: 'paths/orders.yaml',
      },
    ]);
  });

  it('serializes without indentation but leaves a view with no ai projection full (e.g. overview)', () => {
    const json = renderView(
      {
        kind: 'overview',
        overview: {
          docName: 'openapi.yaml',
          spec: 'oas3_0',
          tags: [],
          operations: 0,
          webhooks: [],
          components: [],
        },
      },
      'ai'
    );
    expect(json).not.toContain('\n');
    expect(JSON.parse(json)).toEqual({
      docName: 'openapi.yaml',
      spec: 'oas3_0',
      tags: [],
      operations: 0,
      webhooks: [],
      components: [],
    });
  });

  it('replaces a with-deps closure with signatures at depth 1-2 and bare ids beyond that', () => {
    const json = renderView(
      {
        kind: 'component-card',
        card: {
          component: 'schemas',
          name: 'Plan',
          pointer: '#/components/schemas/Plan',
          file: 'openapi.yaml',
          start_line: 1,
          end_line: 5,
          refs: [
            {
              ref: '#/components/schemas/OneTimeSalePlan',
              resolved: true,
              component: 'schemas',
              name: 'OneTimeSalePlan',
              file: 'openapi.yaml',
              pointer: '#/components/schemas/OneTimeSalePlan',
              start_line: 6,
              end_line: 10,
            },
          ],
          usedBy: [],
          content: 'allOf: []',
          deps: [
            {
              id: 'schemas/OneTimeSalePlan',
              pointer: '#/components/schemas/OneTimeSalePlan',
              file: 'openapi.yaml',
              start_line: 6,
              end_line: 10,
              content: [
                '  type: object',
                '  required:',
                '    - name',
                '  properties:',
                '    name:',
                '      type: string',
                "    currency: { $ref: '#/components/schemas/CurrencyCode' }",
              ].join('\n'),
              refs: [
                {
                  ref: '#/components/schemas/CurrencyCode',
                  resolved: true,
                  file: 'openapi.yaml',
                  pointer: '#/components/schemas/CurrencyCode',
                  start_line: 20,
                  end_line: 21,
                },
              ],
            },
            {
              id: 'schemas/CurrencyCode',
              pointer: '#/components/schemas/CurrencyCode',
              file: 'openapi.yaml',
              start_line: 20,
              end_line: 21,
              content: '  type: string',
              refs: [],
            },
            {
              id: 'schemas/NeverReferenced',
              pointer: '#/components/schemas/NeverReferenced',
              file: 'openapi.yaml',
              start_line: 30,
              end_line: 31,
              content: '  type: string',
              refs: [],
            },
          ],
        },
      },
      'ai'
    );

    const payload = JSON.parse(json);
    expect(payload.content).toBe('allOf: []');
    expect(payload.deps).toEqual([
      {
        id: 'schemas/OneTimeSalePlan',
        pointer: '#/components/schemas/OneTimeSalePlan',
        file: 'openapi.yaml',
        start_line: 6,
        end_line: 10,
        signature: 'name*:string, currency→CurrencyCode',
      },
      {
        id: 'schemas/CurrencyCode',
        pointer: '#/components/schemas/CurrencyCode',
        file: 'openapi.yaml',
        start_line: 20,
        end_line: 21,
        signature: 'string',
      },
    ]);
    expect(payload.deeper).toEqual(['schemas/NeverReferenced']);
    expect(payload.hint).toBe('redocly tree <file> --component=schemas --name=<Name> --format=ai');
  });

  it('passes a card through unchanged when --with-deps was not used', () => {
    const json = renderView(
      {
        kind: 'operation-card',
        card: {
          method: 'get',
          path: '/tickets',
          tags: [],
          pointer: '#/get',
          file: 'openapi.yaml',
          start_line: 1,
          end_line: 5,
          refs: [],
          usedBy: [],
        },
      },
      'ai'
    );

    expect(JSON.parse(json)).not.toHaveProperty('deps');
    expect(JSON.parse(json)).not.toHaveProperty('deeper');
  });
});
