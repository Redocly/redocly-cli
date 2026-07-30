import type { CoverageReport } from '../../../commands/coverage/engine/analyse.js';
import { renderCoverage } from '../../../commands/coverage/reporter.js';

const REPORT: CoverageReport = {
  exchanges: { total: 3, withBody: 2 },
  operations: { seen: 1, total: 2, unused: ['GET /health  getHealth'] },
  seenProperties: 3,
  seenPropertiesAccepted: 3,
  totalProperties: 6,
  schemas: [
    {
      name: 'User',
      reached: true,
      seen: 3,
      count: 4,
      unusedProperties: ['neverSent'],
      unusedVariants: [{ path: 'badge', keyword: 'oneOf', branches: [1] }],
    },
    {
      name: 'Badge',
      reached: false,
      seen: 0,
      count: 1,
      unusedProperties: ['name'],
      unusedVariants: [],
    },
  ],
  unusedSchemas: ['Badge'],
};

describe('renderCoverage', () => {
  it('leads with both headline figures', () => {
    const output = renderCoverage(REPORT, { format: 'stylish', all: false });

    expect(output.split('\n').slice(0, 2)).toEqual([
      '1/2 operations exercised (50%)',
      '3/6 documented properties observed (50%) over 2 of 3 exchange(s)',
    ]);
  });

  it('names the accepted-only figure when some coverage came from rejected traffic', () => {
    const output = renderCoverage(
      { ...REPORT, seenProperties: 3, seenPropertiesAccepted: 1 },
      { format: 'stylish', all: false }
    );

    expect(output).toContain('1 of those came from a response the API accepted');
  });

  it('stays quiet about the split when every exchange was accepted', () => {
    expect(renderCoverage(REPORT, { format: 'stylish', all: false })).not.toContain(
      'came from a response the API accepted'
    );
  });

  it('ends with a trailing newline, as the other commands render', () => {
    expect(renderCoverage(REPORT, { format: 'stylish', all: false })).toMatch(/\n$/);
  });

  it('collapses schemas nothing reached unless --all is passed', () => {
    const output = renderCoverage(REPORT, { format: 'stylish', all: false });

    expect(output).toContain('pass --all to list them');
    expect(output).not.toContain('    Badge');
  });

  it('lists them when --all is passed', () => {
    const output = renderCoverage(REPORT, { format: 'stylish', all: true });

    expect(output).toContain('    Badge');
    expect(output).toContain('    GET /health  getHealth');
  });

  it('marks a fully covered schema and names an unmatched branch', () => {
    const output = renderCoverage(REPORT, { format: 'stylish', all: true });

    expect(output).toContain('badge  oneOf branch 1 never matched');
  });

  it('shows a reached schema whose only finding is an unmatched branch', () => {
    const unions: CoverageReport = {
      exchanges: { total: 1, withBody: 1 },
      operations: { seen: 1, total: 1, unused: [] },
      seenProperties: 0,
      seenPropertiesAccepted: 0,
      totalProperties: 0,
      schemas: [
        {
          name: 'Shape',
          reached: true,
          seen: 0,
          count: 0,
          unusedProperties: [],
          unusedVariants: [{ path: '', keyword: 'oneOf', branches: [1] }],
        },
      ],
      unusedSchemas: [],
    };

    expect(renderCoverage(unions, { format: 'stylish', all: false })).toContain(
      '(root)  oneOf branch 1 never matched'
    );
  });

  it('renders valid JSON carrying the same figures', () => {
    const parsed = JSON.parse(renderCoverage(REPORT, { format: 'json', all: false }));

    expect(parsed).toMatchObject({ seenProperties: 3, operations: { seen: 1, total: 2 } });
  });

  it('reports zero rather than dividing by zero on an empty description', () => {
    const empty: CoverageReport = {
      exchanges: { total: 0, withBody: 0 },
      operations: { seen: 0, total: 0, unused: [] },
      seenProperties: 0,
      seenPropertiesAccepted: 0,
      totalProperties: 0,
      schemas: [],
      unusedSchemas: [],
    };

    expect(renderCoverage(empty, { format: 'stylish', all: false })).toContain(
      '0/0 operations exercised (0%)'
    );
  });
});
