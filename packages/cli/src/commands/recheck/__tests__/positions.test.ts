import { Source } from '@redocly/openapi-core';
import { describe, expect, it } from 'vitest';

import { createPositionMapper } from '../positions.js';

function yaml(body: string): Source {
  return new Source('/api/openapi.yaml', body);
}

describe('createPositionMapper', () => {
  it('maps a literal block exactly: indicator line plus content line, indent plus column', () => {
    const lines = [
      'openapi: 3.1.0',
      'info:',
      '  title: t',
      '  version: "1"',
      '  description: |',
      '        First line.',
      '        Second line here.',
    ];
    const mapper = createPositionMapper(yaml(lines.join('\n') + '\n'), '#/info/description');
    expect(mapper(2, 15)).toEqual({ line: 7, column: 23 });
    expect(mapper(1, 1)).toEqual({ line: 6, column: 9 });
  });

  it('honours a chomping indicator on a literal block', () => {
    const body = 'info:\n  description: |-\n    One.\n    Two.\n';
    const mapper = createPositionMapper(yaml(body), '#/info/description');
    expect(mapper(2, 3)).toEqual({ line: 4, column: 7 });
  });

  it('anchors a folded block to its first content line', () => {
    const body = 'info:\n  description: >\n    Folded text\n    continues here.\n';
    const mapper = createPositionMapper(yaml(body), '#/info/description');
    expect(mapper(1, 20)).toEqual({ line: 3, column: 5 });
  });

  it('maps a single-line plain scalar exactly', () => {
    const body = 'info:\n  description: Buy a ticket first.\n';
    const mapper = createPositionMapper(yaml(body), '#/info/description');
    expect(mapper(1, 5)).toEqual({ line: 2, column: 20 });
  });

  it('anchors a multi-line plain scalar to its start', () => {
    const body = 'info:\n  description: Buy a ticket\n    first.\n';
    const mapper = createPositionMapper(yaml(body), '#/info/description');
    expect(mapper(1, 5)).toEqual({ line: 2, column: 16 });
  });

  it('maps a double-quoted scalar without escapes exactly', () => {
    const body = 'info:\n  description: "Buy a ticket first."\n';
    const mapper = createPositionMapper(yaml(body), '#/info/description');
    expect(mapper(1, 5)).toEqual({ line: 2, column: 21 });
  });

  it('anchors a double-quoted scalar with escapes to the value start', () => {
    const body = 'info:\n  description: "Buy a ticket.\\nThen enter."\n';
    const mapper = createPositionMapper(yaml(body), '#/info/description');
    expect(mapper(2, 3)).toEqual({ line: 2, column: 17 });
  });

  it('anchors a single-quoted scalar with an escaped quote', () => {
    const body = "info:\n  description: 'It''s open.'\n";
    const mapper = createPositionMapper(yaml(body), '#/info/description');
    expect(mapper(1, 4)).toEqual({ line: 2, column: 17 });
  });

  it('ignores a trailing comment when it checks a quoted scalar for escapes', () => {
    const body = 'info:\n  description: "Buy a ticket first." # see \\d note\n';
    const mapper = createPositionMapper(yaml(body), '#/info/description');
    expect(mapper(1, 5)).toEqual({ line: 2, column: 21 });
  });

  it('honours an explicit indentation indicator on a literal block', () => {
    const body = 'info:\n  description: |2\n      One.\n      Two.\n';
    const mapper = createPositionMapper(yaml(body), '#/info/description');
    expect(mapper(1, 1)).toEqual({ line: 3, column: 5 });
  });

  it('treats a JSON description as a quoted scalar', () => {
    const body = '{\n  "info": {\n    "description": "Json intro here."\n  }\n}\n';
    const mapper = createPositionMapper(
      new Source('/api/openapi.json', body),
      '#/info/description'
    );
    expect(mapper(1, 6)).toEqual({ line: 3, column: 26 });
  });
});
