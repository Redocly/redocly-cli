import type { ApiNodeEnvelope, ApiNodeRef, TypedRef } from '@redocly/openapi-core';

import { buildAiDepsClosure, DEEPER_HINT } from '../print/signature.js';

/** A depth-1 dependency's own signature: seeded from one ref so `dep` alone lands in `deps`. */
function signatureOf(dep: ApiNodeEnvelope): string {
  const seedRef: TypedRef = {
    ref: `#/components/${dep.id}`,
    resolved: true,
    component: dep.id.slice(0, dep.id.indexOf('/')),
    name: dep.id.slice(dep.id.indexOf('/') + 1),
  };
  const closure = buildAiDepsClosure([dep], [seedRef]);
  return closure.deps[0].signature;
}

function schemaRef(name: string, lines: [number, number] = [1, 5]): ApiNodeRef {
  return {
    ref: `#/components/schemas/${name}`,
    resolved: true,
    file: 'openapi.yaml',
    pointer: `#/components/schemas/${name}`,
    start_line: lines[0],
    end_line: lines[1],
  };
}

describe('buildAiDepsClosure: schema signatures', () => {
  it('renders a flat schema: required markers, plain types, and a type array', () => {
    const dep: ApiNodeEnvelope = {
      id: 'schemas/Widget',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 10,
      content: [
        '      type: object',
        '      required:',
        '        - id',
        '        - name',
        '      properties:',
        '        id:',
        '          type: string',
        '        name:',
        '          type: string',
        '        weight:',
        '          type:',
        '            - number',
        '            - "null"',
      ].join('\n'),
      refs: [],
    };

    expect(signatureOf(dep)).toBe('id*:string, name*:string, weight:number|null');
  });

  it('drops descriptions: a schema and property description never reach the signature', () => {
    const dep: ApiNodeEnvelope = {
      id: 'schemas/Described',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 10,
      content: [
        '      description: A widget with a long story.',
        '      type: object',
        '      properties:',
        '        id:',
        '          description: The identifier.',
        '          type: string',
      ].join('\n'),
      refs: [],
    };

    expect(signatureOf(dep)).toBe('id:string');
  });

  it('merges allOf members into one property list and hoists a nested anyOf to the header', () => {
    // Mirrors Rebilly's Plan schema: allOf of an inline object and an anyOf-only member.
    const dep: ApiNodeEnvelope = {
      id: 'schemas/Plan',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 12,
      content: [
        '      allOf:',
        '        - type: object',
        '          properties:',
        '            id:',
        '              type: string',
        '        - anyOf:',
        "            - $ref: '#/components/schemas/OneTimeSalePlan'",
        "            - $ref: '#/components/schemas/SubscriptionPlan'",
        "            - $ref: '#/components/schemas/TrialOnlyPlan'",
      ].join('\n'),
      refs: [
        schemaRef('OneTimeSalePlan'),
        schemaRef('SubscriptionPlan'),
        schemaRef('TrialOnlyPlan'),
      ],
    };

    expect(signatureOf(dep)).toBe(
      '[anyOf: OneTimeSalePlan, SubscriptionPlan, TrialOnlyPlan]: id:string'
    );
  });

  it('names a ref-typed allOf member in the header instead of merging it, alongside merged properties', () => {
    const dep: ApiNodeEnvelope = {
      id: 'schemas/Forbidden',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 8,
      content: [
        '      allOf:',
        "        - $ref: '#/components/schemas/BaseProblem'",
        '        - type: object',
        '          properties:',
        '            status:',
        '              type: integer',
      ].join('\n'),
      refs: [schemaRef('BaseProblem')],
    };

    expect(signatureOf(dep)).toBe('[allOf: BaseProblem]: status:integer');
  });

  it('names anyOf/oneOf variants and renders a discriminator in the header', () => {
    const dep: ApiNodeEnvelope = {
      id: 'schemas/Pet',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 8,
      content: [
        '      oneOf:',
        "        - $ref: '#/components/schemas/Cat'",
        "        - $ref: '#/components/schemas/Dog'",
        '      discriminator:',
        '        propertyName: petType',
      ].join('\n'),
      refs: [schemaRef('Cat'), schemaRef('Dog')],
    };

    expect(signatureOf(dep)).toBe('[oneOf: Cat, Dog, discriminator: petType]');
  });

  it('caps an enum at 6 values with an ellipsis, and renders a single-value enum with none', () => {
    const dep: ApiNodeEnvelope = {
      id: 'schemas/Status',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 10,
      content: [
        '      type: object',
        '      required:',
        '        - formula',
        '      properties:',
        '        formula:',
        '          type: string',
        '          enum:',
        '            - flat-rate',
        '        state:',
        '          type: string',
        '          enum:',
        '            - a',
        '            - b',
        '            - c',
        '            - d',
        '            - e',
        '            - f',
        '            - g',
      ].join('\n'),
      refs: [],
    };

    expect(signatureOf(dep)).toBe('formula*:string=flat-rate, state:string=a|b|c|d|e|f…');
  });

  it('renders a $ref property as field→Target instead of a type', () => {
    const dep: ApiNodeEnvelope = {
      id: 'schemas/Order',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 8,
      content: [
        '      type: object',
        '      required:',
        '        - owner',
        '      properties:',
        '        owner:',
        "          $ref: '#/components/schemas/User'",
      ].join('\n'),
      refs: [schemaRef('User')],
    };

    expect(signatureOf(dep)).toBe('owner*→User');
  });

  it('falls back to the schema’s own type when it has no properties or composition', () => {
    const dep: ApiNodeEnvelope = {
      id: 'schemas/CreatedTime',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 3,
      content: ['      type: string', '      format: date-time', '      readOnly: true'].join('\n'),
      refs: [],
    };

    expect(signatureOf(dep)).toBe('string');
  });

  it('parses content whose sliced range trails into the next sibling key', () => {
    // buildNodeEnvelope's line range includes the following key's own line (see slice.ts), so a
    // dependency's raw content is one line short of standalone YAML unless that line is dropped.
    const dep: ApiNodeEnvelope = {
      id: 'schemas/Trailing',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 5,
      content: [
        '      type: object',
        '      properties:',
        '        id:',
        '          type: string',
        '    NextSibling:',
      ].join('\n'),
      refs: [],
    };

    expect(signatureOf(dep)).toBe('id:string');
  });

  it('falls back to an empty signature for content that still fails to parse', () => {
    const dep: ApiNodeEnvelope = {
      id: 'schemas/Broken',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 2,
      content: "      key: 'unterminated",
      refs: [],
    };

    expect(signatureOf(dep)).toBe('');
  });
});

describe('buildAiDepsClosure: non-schema dependencies', () => {
  it('renders a one-line summary with no property list', () => {
    const dep: ApiNodeEnvelope = {
      id: 'responses/NotFound',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 2,
      content: '      description: The resource was not found.',
      refs: [],
    };

    expect(signatureOf(dep)).toBe('The resource was not found.');
  });

  it('renders the $ref target when the component is itself a bare alias', () => {
    const dep: ApiNodeEnvelope = {
      id: 'responses/NotFound',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 1,
      content: "      $ref: '#/components/responses/CommonNotFound'",
      refs: [
        {
          ref: '#/components/responses/CommonNotFound',
          resolved: true,
          file: 'openapi.yaml',
          pointer: '#/components/responses/CommonNotFound',
          start_line: 10,
          end_line: 12,
        },
      ],
    };

    expect(signatureOf(dep)).toBe('→CommonNotFound');
  });
});

describe('buildAiDepsClosure: depth cut', () => {
  const depA: ApiNodeEnvelope = {
    id: 'schemas/A',
    file: 'openapi.yaml',
    start_line: 1,
    end_line: 3,
    content: ['      type: object', '      properties:', "        b: { $ref: '#/B' }"].join('\n'),
    refs: [{ ref: '#/B', resolved: true, file: 'openapi.yaml', pointer: '#/components/schemas/B' }],
  };
  const depB: ApiNodeEnvelope = {
    id: 'schemas/B',
    file: 'openapi.yaml',
    start_line: 4,
    end_line: 6,
    content: ['      type: object', '      properties:', "        c: { $ref: '#/C' }"].join('\n'),
    refs: [{ ref: '#/C', resolved: true, file: 'openapi.yaml', pointer: '#/components/schemas/C' }],
  };
  const depC: ApiNodeEnvelope = {
    id: 'schemas/C',
    file: 'openapi.yaml',
    start_line: 7,
    end_line: 8,
    content: '      type: string',
    refs: [],
  };
  const seedRefA: TypedRef = { ref: '#/A', resolved: true, component: 'schemas', name: 'A' };

  it('keeps depth 1 and depth 2 as signatures, and pushes depth 3 into deeper with a hint', () => {
    const closure = buildAiDepsClosure([depA, depB, depC], [seedRefA]);

    expect(closure.deps.map((dep) => dep.id)).toEqual(['schemas/A', 'schemas/B']);
    expect(closure.deps[0].signature).toBe('b→B');
    expect(closure.deps[1].signature).toBe('c→C');
    expect(closure.deeper).toEqual(['schemas/C']);
    expect(closure.hint).toBe(DEEPER_HINT);
  });

  it('omits the hint when nothing falls past depth 2', () => {
    const closure = buildAiDepsClosure([depA, depB], [seedRefA]);

    expect(closure.deps.map((dep) => dep.id)).toEqual(['schemas/A', 'schemas/B']);
    expect(closure.deeper).toEqual([]);
    expect(closure.hint).toBeUndefined();
  });

  it('keeps each near dependency’s own coordinates (file, pointer, lines)', () => {
    const closure = buildAiDepsClosure([depA], [seedRefA]);

    expect(closure.deps[0]).toMatchObject({
      id: 'schemas/A',
      file: 'openapi.yaml',
      start_line: 1,
      end_line: 3,
    });
  });
});
