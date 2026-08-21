import type {
  ApiOverview,
  SecurityView,
  ComponentCard,
  ComponentListCard,
  FileCard,
  FindReport,
  OperationCard,
  OperationListCard,
  UsedByReport,
} from '@redocly/openapi-core';

import type { PointerCard, TreeView } from '../index.js';
import { renderAiFileGraph } from '../print/ai.js';
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

  it('renders a pointer card as a glyph tree, with refs and an ancestor branch', () => {
    const rendered = renderViewStylish({
      kind: 'pointer-card',
      card: {
        pointer: '#/components/schemas/Ticket/properties/pricing',
        file: 'openapi.yaml',
        start_line: 40,
        end_line: 42,
        content: "  $ref: '#/components/schemas/Pricing'",
        refs: [
          {
            ref: '#/components/schemas/Pricing',
            resolved: true,
            component: 'schemas',
            name: 'Pricing',
            file: 'openapi.yaml',
            pointer: '#/components/schemas/Pricing',
            start_line: 60,
            end_line: 65,
          },
        ],
        ancestor: {
          id: 'schemas/Ticket',
          pointer: '#/components/schemas/Ticket',
          file: 'openapi.yaml',
          start_line: 12,
          end_line: 50,
          usedByCount: 3,
        },
      },
    });
    expect(rendered).toBe(
      [
        'pointer #/components/schemas/Ticket/properties/pricing',
        '├── source: openapi.yaml#/components/schemas/Ticket/properties/pricing  [40..42]',
        '├── refs (1)',
        '│   └── schemas/Pricing → openapi.yaml#/components/schemas/Pricing  [60..65]',
        '└── ancestor: schemas/Ticket  [12..50] · usedBy: 3',
      ].join('\n')
    );
  });

  it('renders a pointer card with no refs and no ancestor', () => {
    const rendered = renderViewStylish({
      kind: 'pointer-card',
      card: {
        pointer: '#/info/title',
        file: 'openapi.yaml',
        start_line: 2,
        end_line: 2,
        content: 'title: Museum API',
        refs: [],
      },
    });
    expect(rendered).toBe(
      ['pointer #/info/title', '└── source: openapi.yaml#/info/title  [2..2]'].join('\n')
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

  it('renders a find view in stylish', () => {
    const view: TreeView = {
      kind: 'find',
      report: {
        terms: ['pet'],
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
        ],
        components: [
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
        ],
        totalOperations: 25, // > FIND_LIMIT would show the overflow line; use what you assert
        totalComponents: 1,
      },
    };
    expect(renderViewStylish(view)).toMatchInlineSnapshot(`
      "find "pet" · 25 operations · 1 components

      /tickets (1)
      └── POST "Buy museum tickets" paths/tickets.yaml:10..40 [Tickets]

      components (1)
      └── schemas/Ticket "A museum ticket." openapi.yaml:12..20

      … 24 more operations — narrow the terms."
    `);
  });

  it('renders a find view in stylish with no matches', () => {
    const view: TreeView = {
      kind: 'find',
      report: {
        terms: ['zzz'],
        operations: [],
        components: [],
        totalOperations: 0,
        totalComponents: 0,
      },
    };
    expect(renderViewStylish(view)).toMatchInlineSnapshot(`
      "find "zzz" · 0 operations · 0 components

      Nothing matched."
    `);
  });

  it('renders a find view in stylish with overflow on both operations and components', () => {
    const view: TreeView = {
      kind: 'find',
      report: {
        terms: ['pet'],
        operations: [
          {
            method: 'get',
            path: '/pets',
            summary: 'List pets',
            tags: ['Pets'],
            pointer: '#/get',
            file: 'openapi.yaml',
            start_line: 1,
            end_line: 9,
            refs: [],
            usedBy: [],
          },
        ],
        components: [
          {
            component: 'schemas',
            name: 'Pet',
            pointer: '#/components/schemas/Pet',
            file: 'openapi.yaml',
            start_line: 12,
            end_line: 20,
            refs: [],
            usedBy: [],
          },
        ],
        totalOperations: 4,
        totalComponents: 3,
      },
    };
    expect(renderViewStylish(view)).toMatchInlineSnapshot(`
      "find "pet" · 4 operations · 3 components

      /pets (1)
      └── GET "List pets" 1..9 [Pets]

      components (1)
      └── schemas/Pet 12..20

      … 3 more operations, 2 more components — narrow the terms."
    `);
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
  const overviewFixture: ApiOverview = {
    docName: 'openapi.yaml',
    spec: 'oas3_0',
    docDescription: 'Museum ticket API.',
    servers: { urls: ['https://api.example.com/v1'] },
    tags: [
      { name: 'Tickets', summary: 'Buy tickets.', operations: 2 },
      { name: 'Orders', operations: 1 },
    ],
    operations: 3,
    webhooks: [{ name: 'newTicket', operations: 1 }],
    components: [{ section: 'schemas', count: 4 }],
  };

  const operationListCardFixture: OperationListCard = {
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
  };

  const componentListCardFixture: ComponentListCard = {
    component: 'schemas',
    name: 'Ticket',
    summary: 'A museum ticket.',
    pointer: '#/components/schemas/Ticket',
    file: 'openapi.yaml',
    start_line: 12,
    end_line: 20,
    refs: [],
    usedBy: [],
  };

  const findReportFixture: FindReport = {
    terms: ['pet'],
    operations: [operationListCardFixture],
    components: [componentListCardFixture],
    totalOperations: 25,
    totalComponents: 1,
  };

  const webhookOperationListCardFixture: OperationListCard = {
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
  };

  it('renders an ai overview collapsed to counts with tag and next lines', () => {
    const view: TreeView = { kind: 'overview', overview: overviewFixture };
    expect(renderView(view, 'ai')).toMatchInlineSnapshot(`
      "openapi.yaml · oas3_0 — Museum ticket API.
      servers: https://api.example.com/v1
      3 operations · 2 tags · 1 webhook operation
      components: schemas 4
      tags: Tickets 2 · Orders 1
      webhooks: 1 (list: --webhooks)
      next: --find=<terms> · --tag=<name> · --path=<p> --operation=<method> [--with-deps] · --component=<section> --name=<n>"
    `);
  });

  it('renders an ai overview expanded to operation lines under tags, and a webhooks block with content', () => {
    const view: TreeView = {
      kind: 'overview',
      overview: overviewFixture,
      operations: [operationListCardFixture],
      webhookOperations: [webhookOperationListCardFixture],
    };
    expect(renderView(view, 'ai')).toMatchInlineSnapshot(`
      "openapi.yaml · oas3_0 — Museum ticket API.
      servers: https://api.example.com/v1
      3 operations · 2 tags · 1 webhook operation
      components: schemas 4
      tag Tickets (1):
      post /tickets · buyTickets · L10 — Buy museum tickets
      tag Orders (0):
      webhooks (1):
      post webhook newTicket · newTicketAlert · L8 — New ticket alert
      next: --find=<terms> · --tag=<name> · --path=<p> --operation=<method> [--with-deps] · --component=<section> --name=<n>"
    `);
  });

  it('renders an ai operations listing as one line per operation', () => {
    const view: TreeView = {
      kind: 'operations',
      scope: 'pets',
      items: [operationListCardFixture],
    };
    expect(renderView(view, 'ai')).toMatchInlineSnapshot(`
      "pets · 1 operation
      post /tickets · buyTickets · L10 — Buy museum tickets
      next: --path=<p> --operation=<method> [--with-deps]"
    `);
  });

  it('adds the `f:` file suffix once an ai operations listing spans multiple files', () => {
    const view: TreeView = {
      kind: 'operations',
      scope: 'pets',
      items: [
        operationListCardFixture,
        { ...operationListCardFixture, path: '/orders', file: 'paths/orders.yaml', start_line: 5 },
      ],
    };
    const rendered = renderView(view, 'ai');
    expect(rendered).toContain(' · f:paths/tickets.yaml');
    expect(rendered).toContain(' · f:paths/orders.yaml');
  });

  it('renders a bare --tag listing in both formats', () => {
    const view: TreeView = {
      kind: 'tags',
      items: [
        { name: 'Tickets', summary: 'Buy tickets.', operations: 2 },
        { name: 'Refunds', operations: 1 },
      ],
    };
    expect(renderView(view, 'ai')).toMatchInlineSnapshot(`
      "tags · 2 tags
      Tickets · 2 operations — Buy tickets.
      Refunds · 1 operation
      next: --tag=<name>"
    `);
    expect(renderView(view, 'stylish')).toMatchInlineSnapshot(`
      "Tags (2)
      ├── Tickets (2) — Buy tickets.
      └── Refunds (1)

      Use --tag=<name> for a tag’s operations."
    `);
  });

  it('renders the ai file graph, collapsing to directories past the expand limit', () => {
    const small = {
      nodes: [
        { id: 'openapi.yaml', resolved: true, root: true },
        { id: 'paths/tickets.yaml', resolved: true },
        { id: 'missing.yaml', resolved: false },
      ],
      edges: [{ from: 'openapi.yaml', to: 'paths/tickets.yaml' }],
      roots: ['openapi.yaml'],
    };
    expect(renderAiFileGraph(small as never)).toMatchInlineSnapshot(`
      "files · 3 files · 1 link · 1 unresolved ref
      root: openapi.yaml
      openapi.yaml · 1 ref
      paths/tickets.yaml
      missing.yaml · unresolved
      next: --file=<path> [--used-by] · --files --format=json for the whole graph"
    `);

    // A description split into thousands of files has a graph bigger than most of the
    // description; past the limit it reports shape instead of dumping every node.
    const large = {
      nodes: Array.from({ length: 60 }, (_, index) => ({
        id: `resources/${index % 3 === 0 ? 'droplets' : 'volumes'}/file${index}.yml`,
        resolved: true,
      })),
      edges: [],
      roots: ['openapi.yaml'],
    };
    const rendered = renderAiFileGraph(large as never);
    expect(rendered).toContain('files · 60 files · 0 links');
    expect(rendered).toContain('directories: resources/volumes 40 · resources/droplets 20');
    expect(rendered).not.toContain('file7.yml');
  });

  it('renders batched operation cards with one shared dependency closure', () => {
    // Fetched one at a time, these two cards would repeat the schema they share; batched, it
    // arrives once, and the caller pays for one round trip instead of two.
    const shared = {
      id: 'schemas/Ticket',
      pointer: '#/components/schemas/Ticket',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 5,
      content: 'type: object\nproperties:\n  id:\n    type: string\n',
      refs: [],
    };
    const ticketRef = {
      ref: '#/components/schemas/Ticket',
      resolved: true,
      component: 'schemas',
      name: 'Ticket',
      file: 'openapi.yaml',
      pointer: '#/components/schemas/Ticket',
      start_line: 1,
      end_line: 5,
    };
    const view: TreeView = {
      kind: 'operation-cards',
      scope: 'Tickets',
      omitted: 2,
      cards: [
        {
          ...operationCardWithDepsFixture,
          method: 'get',
          operationId: 'listTickets',
          refs: [ticketRef],
          deps: [shared],
          content: 'get:\n  operationId: listTickets\n',
        },
        {
          ...operationCardWithDepsFixture,
          method: 'post',
          operationId: 'buyTickets',
          refs: [ticketRef],
          deps: [shared],
          content: 'post:\n  operationId: buyTickets\n',
        },
      ],
    };

    const rendered = renderView(view, 'ai');

    expect(rendered).toContain('Tickets · 2 operations with deps');
    expect(rendered).toContain('listTickets');
    expect(rendered).toContain('buyTickets');
    expect(rendered).toContain('--- deps (1 shared, signatures depth ≤2)');
    expect(rendered.match(/schemas\/Ticket L1-5/g)).toHaveLength(1);
    expect(rendered).toContain('… 2 more operations — narrow the selection.');
  });

  it('renders an ai components listing', () => {
    const componentsView: TreeView = {
      kind: 'components',
      section: 'schemas',
      items: [componentListCardFixture],
    };
    expect(renderView(componentsView, 'ai')).toMatchInlineSnapshot(`
      "schemas · 1 component
      schemas/Ticket · L12 — A museum ticket.
      next: --component=schemas --name=<Name> [--with-deps]"
    `);
  });

  it('renders an ai find report with the overflow line', () => {
    const view: TreeView = { kind: 'find', report: findReportFixture };
    expect(renderView(view, 'ai')).toMatchInlineSnapshot(`
      "find "pet" · 25 operations · 1 component
      post /tickets · buyTickets · L10 · f:paths/tickets.yaml — Buy museum tickets
      schemas/Ticket · L12 · f:openapi.yaml — A museum ticket.
      … 24 more operations — narrow the terms.
      next: --path=<p> --operation=<method> [--with-deps] · --component=<section> --name=<Name>"
    `);
  });

  const operationCardWithDepsFixture: OperationCard = {
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
    content: 'post:\n  summary: Buy museum tickets\n  operationId: buyTickets',
    deps: [
      {
        id: 'schemas/Ticket',
        pointer: '#/components/schemas/Ticket',
        file: 'openapi.yaml',
        start_line: 1,
        end_line: 5,
        content: [
          '  type: object',
          '  required:',
          '    - id',
          '  properties:',
          '    id:',
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
  };

  it('renders an ai operation card: header, json body, deps signatures, deeper, usedBy count', () => {
    const view: TreeView = { kind: 'operation-card', card: operationCardWithDepsFixture };
    const rendered = renderView(view, 'ai');
    expect(rendered).toContain('--- json');
    expect(rendered).not.toContain('"pointer"');
    expect(rendered).toMatchInlineSnapshot(`
      "post /tickets · buyTickets · paths/tickets.yaml L10-40 · tags: Tickets — Buy museum tickets
      --- json
      {"post":{"summary":"Buy museum tickets","operationId":"buyTickets"}}
      --- deps (2, signatures depth ≤2)
      schemas/Ticket L1-5 · f:openapi.yaml: id*:string, currency→CurrencyCode
      schemas/CurrencyCode L20-21 · f:openapi.yaml: string
      deeper: schemas/NeverReferenced
      usedBy: 1 (--used-by)
      next: --component=<section> --name=<Name> (any id above) · --pointer=<$ref>"
    `);
  });

  it('states the effective security on an ai card and in the ai overview', () => {
    const security: SecurityView = {
      requirements: [{ SecretApiKey: [] }, { OAuth2: ['orders:write'] }],
      schemes: [
        { name: 'SecretApiKey', type: 'apiKey', in: 'header', keyName: 'REB-APIKEY' },
        { name: 'OAuth2', type: 'oauth2' },
      ],
    };

    const card = renderView(
      { kind: 'operation-card', card: { ...operationCardWithDepsFixture, security } },
      'ai'
    );
    // The name alone does not say which header carries the key, so the card resolves it.
    expect(card).toContain(
      'auth: SecretApiKey · apiKey in header REB-APIKEY | OAuth2 · oauth2 (orders:write)'
    );

    const overview = renderView(
      { kind: 'overview', overview: { ...overviewFixture, security } },
      'ai'
    );
    expect(overview).toContain('security: SecretApiKey · apiKey in header REB-APIKEY');
  });

  it('keeps whole-file dependencies in the closure and names them once', () => {
    // A description that lays its files out its own way — not `components/<section>/<name>` —
    // still has to reach the caller: before, every such ref was unclassifiable and the closure
    // came back empty, so an agent fell back to reading the files itself.
    const card: OperationCard = {
      ...operationCardWithDepsFixture,
      refs: [
        {
          ref: './models/droplet_create.yml',
          resolved: true,
          component: 'unknown',
          file: 'resources/droplets/models/droplet_create.yml',
          pointer: '#/',
          start_line: 1,
          end_line: 20,
        },
      ],
      deps: [
        {
          id: 'resources/droplets/models/droplet_create.yml',
          pointer: '#/',
          file: 'resources/droplets/models/droplet_create.yml',
          start_line: 1,
          end_line: 20,
          content: 'type: object\nproperties:\n  name:\n    type: string\n',
          refs: [],
        },
      ],
    };

    const rendered = renderView({ kind: 'operation-card', card }, 'ai');

    expect(rendered).toContain('--- deps (1, signatures depth ≤2)');
    expect(rendered).toContain('resources/droplets/models/droplet_create.yml L1-20: name:string');
    // The section prefix of a file id says nothing, so the shape decides it is a schema.
    expect(rendered).not.toContain('· f:resources/droplets/models/droplet_create.yml');
    expect(rendered).not.toContain('deeper:');
  });

  it('clips prose in an ai card body and folds error responses to their codes', () => {
    const ownDescription = [
      'This endpoint makes use of a hypermedia relation to determine which URL to access.',
      'Use the `upload_url` returned by the create-release response to upload an asset.',
      'Most libraries handle this for you, and the ones that do not will need a client that '.repeat(
        6
      ),
    ].join(' ');
    const fieldDescription =
      'The file name of the asset. An upload that collides with a name already attached to this release answers 422, so the caller has to delete the old asset first.';
    const card: OperationCard = {
      ...operationCardWithDepsFixture,
      content: [
        `description: ${ownDescription}`,
        'requestBody:',
        '  content:',
        '    application/json:',
        '      schema:',
        '        properties:',
        '          name:',
        `            description: ${fieldDescription}`,
        'responses:',
        "  '201':",
        '    description: Created',
        "  '404':",
        '    description: Not found',
        "  '422':",
        '    description: Validation failed',
      ].join('\n'),
    };

    const body = renderView({ kind: 'operation-card', card }, 'ai').split('\n')[2];

    // The sentence that names `upload_url` is the point of the card, and it is the second one.
    expect(body).toContain('Use the `upload_url` returned by the create-release response');
    expect(body).not.toContain('Most libraries handle this for you');
    expect(body).toContain('"description":"The file name of the asset. …"');
    expect(body).toContain('"201":{"description":"Created"}');
    expect(body).toContain('"errors":"404, 422"');
    expect(body).not.toContain('Not found');
  });

  it('renders an ai operation card without deps: compact refs line', () => {
    const cardWithoutDeps: OperationCard = {
      method: 'get',
      path: '/tickets/{id}',
      tags: [],
      pointer: '#/get',
      file: 'paths/tickets.yaml',
      start_line: 42,
      end_line: 50,
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
        { ref: './schemas/Missing.yaml', resolved: false, component: 'unknown' },
      ],
      usedBy: [],
      content: 'get:\n  summary: Get a ticket',
    };
    const view: TreeView = { kind: 'operation-card', card: cardWithoutDeps };
    const rendered = renderView(view, 'ai');
    expect(rendered).not.toContain('--- deps');
    expect(rendered).toContain('refs: schemas/Ticket L1');
    expect(rendered).toMatchInlineSnapshot(`
      "get /tickets/{id} · paths/tickets.yaml L42-50
      --- json
      {"get":{"summary":"Get a ticket"}}
      refs: schemas/Ticket L1 · ./schemas/Missing.yaml (unresolved)
      next: --with-deps · --component=<section> --name=<Name> (any id above) · --pointer=<$ref>"
    `);
  });

  const componentCardWithContentFixture: ComponentCard = {
    component: 'schemas',
    name: 'Ticket',
    summary: 'A museum ticket.',
    pointer: '#/components/schemas/Ticket',
    file: 'openapi.yaml',
    start_line: 12,
    end_line: 20,
    refs: [],
    usedBy: [
      {
        id: 'POST /tickets',
        method: 'post',
        path: '/tickets',
        file: 'paths/tickets.yaml',
        pointer: '#/post',
        start_line: 10,
        end_line: 40,
      },
    ],
    content: [
      '  type: object',
      '  required:',
      '    - id',
      '  properties:',
      '    id:',
      '      type: string',
    ].join('\n'),
  };

  it('renders an ai component card with its own signature line and a json body', () => {
    const view: TreeView = { kind: 'component-card', card: componentCardWithContentFixture };
    const rendered = renderView(view, 'ai');
    expect(rendered).toContain('signature:');
    expect(rendered).toContain('--- json');
    expect(rendered).toMatchInlineSnapshot(`
      "schemas/Ticket · openapi.yaml L12-20 — A museum ticket.
      signature: id*:string
      --- json
      {"type":"object","required":["id"],"properties":{"id":{"type":"string"}}}
      usedBy: 1 (--used-by)
      next: --with-deps · --component=<section> --name=<Name> (any id above) · --pointer=<$ref>"
    `);
  });

  it('folds a top-level x-* vendor key into an "omitted" marker with its own coordinates', () => {
    const cardWithVendorKey: OperationCard = {
      method: 'get',
      path: '/widgets',
      tags: [],
      pointer: '#/get',
      file: 'paths/widgets.yaml',
      start_line: 100,
      end_line: 109,
      refs: [],
      usedBy: [],
      content: [
        '      operationId: listWidgets',
        '      summary: List widgets',
        '      x-codeSamples:',
        '        - lang: PHP',
        '          source: |',
        '            <?php',
        '            echo "hi";',
        '      responses:',
        "        '200':",
        '          description: OK',
      ].join('\n'),
    };
    const view: TreeView = { kind: 'operation-card', card: cardWithVendorKey };
    const rendered = renderView(view, 'ai');

    expect(rendered).toContain('"x-codeSamples":"omitted (L102-106)"');
    expect(rendered).not.toContain('PHP');
    expect(rendered).not.toContain('echo');
    expect(rendered).toMatchInlineSnapshot(`
      "get /widgets · paths/widgets.yaml L100-109
      --- json
      {"operationId":"listWidgets","summary":"List widgets","x-codeSamples":"omitted (L102-106)","responses":{"200":{"description":"OK"}}}
      next: --with-deps · --component=<section> --name=<Name> (any id above) · --pointer=<$ref>"
    `);
  });

  it('falls back to the raw --- yaml block when the content is unparsable', () => {
    const cardWithUnparsableContent: OperationCard = {
      method: 'get',
      path: '/broken',
      tags: [],
      pointer: '#/get',
      file: 'paths/broken.yaml',
      start_line: 5,
      end_line: 6,
      refs: [],
      usedBy: [],
      content: '{{{ not yaml',
    };
    const view: TreeView = { kind: 'operation-card', card: cardWithUnparsableContent };
    const rendered = renderView(view, 'ai');

    expect(rendered).not.toContain('--- json');
    expect(rendered).toMatchInlineSnapshot(`
      "get /broken · paths/broken.yaml L5-6
      --- yaml
      {{{ not yaml
      next: --with-deps · --component=<section> --name=<Name> (any id above) · --pointer=<$ref>"
    `);
  });

  it('renders an ai used-by report as via lines', () => {
    const report: UsedByReport = {
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
      affectedComponents: [
        {
          id: 'schemas/Order',
          component: 'schemas',
          name: 'Order',
          file: 'openapi.yaml',
          pointer: '#/components/schemas/Order',
          start_line: 50,
          end_line: 60,
          via: ['schemas/Ticket', 'schemas/Order'],
        },
      ],
    };
    const rendered = renderView({ kind: 'used-by', report }, 'ai');
    expect(rendered).toContain(' via schemas/Ticket → POST /tickets');
    expect(rendered).toMatchInlineSnapshot(`
      "used-by schemas/Ticket · openapi.yaml L1-5
      operations (1):
      post /tickets · L10 · f:paths/tickets.yaml via schemas/Ticket → POST /tickets
      components (1):
      schemas/Order · L50 via schemas/Ticket → schemas/Order"
    `);
  });

  it('renders an ai used-by report with nothing referencing the target', () => {
    const report: UsedByReport = {
      target: { id: 'paths/orphan.yaml', file: 'paths/orphan.yaml' },
      affectedOperations: [],
      affectedComponents: [],
    };
    expect(renderView({ kind: 'used-by', report }, 'ai')).toMatchInlineSnapshot(`
      "used-by paths/orphan.yaml
      Nothing references it."
    `);
  });

  it('renders an ai file card as define lines', () => {
    const card: FileCard = {
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
          summary: 'A museum ticket.',
          pointer: '#/',
          file: 'paths/tickets.yaml',
          start_line: 11,
          end_line: 15,
          refs: [],
          usedBy: [],
        },
      ],
    };
    expect(renderView({ kind: 'file-card', card }, 'ai')).toMatchInlineSnapshot(`
      "file paths/tickets.yaml · defines 2
      get /tickets · listTickets · L1 — List tickets
      schemas/Ticket · L11 — A museum ticket.
      next: --path=<p> --operation=<method> [--with-deps] · --component=<section> --name=<Name>"
    `);
  });

  it('renders an ai pointer card with a json body, refs, and an ancestor line with a --pointer hint', () => {
    const card: PointerCard = {
      pointer: '#/components/schemas/Ticket/properties/pricing',
      file: 'openapi.yaml',
      start_line: 42,
      end_line: 42,
      content: "      $ref: '#/components/schemas/Pricing'",
      refs: [
        {
          ref: '#/components/schemas/Pricing',
          resolved: true,
          component: 'schemas',
          name: 'Pricing',
          file: 'openapi.yaml',
          pointer: '#/components/schemas/Pricing',
          start_line: 60,
          end_line: 65,
        },
      ],
      ancestor: {
        id: 'schemas/Ticket',
        pointer: '#/components/schemas/Ticket',
        file: 'openapi.yaml',
        start_line: 12,
        end_line: 50,
        usedByCount: 3,
      },
    };
    const view: TreeView = { kind: 'pointer-card', card };
    expect(renderView(view, 'ai')).toMatchInlineSnapshot(`
      "pointer #/components/schemas/Ticket/properties/pricing · openapi.yaml L42-42
      --- json
      {"$ref":"#/components/schemas/Pricing"}
      refs: schemas/Pricing L60
      ancestor: schemas/Ticket L12-50 · usedBy: 3 (--used-by --pointer='#/components/schemas/Ticket')"
    `);
  });

  it('renders an ai pointer card with no ancestor, falling back to raw yaml for unparsable (scalar) content', () => {
    const card: PointerCard = {
      pointer: '#/info/title',
      file: 'openapi.yaml',
      start_line: 2,
      end_line: 2,
      content: 'Museum API',
      refs: [],
    };
    const view: TreeView = { kind: 'pointer-card', card };
    expect(renderView(view, 'ai')).toMatchInlineSnapshot(`
      "pointer #/info/title · openapi.yaml L2-2
      --- yaml
      Museum API"
    `);
  });

  it('renders an ai pointer card header with a truncated marker when the sliced content was capped', () => {
    const card: PointerCard = {
      pointer: '#/info/description',
      file: 'openapi.yaml',
      start_line: 2,
      end_line: 2,
      content: 'A very long description',
      refs: [],
      truncated: true,
    };
    const view: TreeView = { kind: 'pointer-card', card };
    expect(renderView(view, 'ai')).toMatchInlineSnapshot(`
      "pointer #/info/description · openapi.yaml L2-2 (truncated at 64 KB)
      --- yaml
      A very long description"
    `);
  });
});
