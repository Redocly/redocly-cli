import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const rulesPath = join(__dirname, 'rules');

interface DiffChange {
  pointer: string;
  property?: string;
  kind: string;
  compat: 'breaking' | 'non-breaking';
  verdicts?: { ruleId: string; message: string; compat: string }[];
}

interface DiffJson {
  summary: { breaking: number; nonBreaking: number };
  changes: DiffChange[];
}

// The command prints the report on stdout and everything else on stderr,
// so stdout parses as JSON on its own.
function runDiff(fixture: string): DiffJson {
  const result = spawnSync(
    'node',
    [indexEntryPoint, 'diff', 'base.yaml', 'revision.yaml', '--format=json', '--fail-on=none'],
    { encoding: 'utf-8', cwd: join(rulesPath, fixture), env: { ...process.env, NO_COLOR: 'TRUE' } }
  );
  if (result.status !== 0) {
    throw new Error(`diff failed for ${fixture}:\n${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

function firedRuleIds(diff: DiffJson): string[] {
  return [
    ...new Set(diff.changes.flatMap((change) => change.verdicts?.map((v) => v.ruleId) ?? [])),
  ];
}

/** A change the command must report as breaking, attributed to `ruleId`. */
const BREAKING: { fixture: string; ruleId: string; describes: string }[] = [
  // ── already covered
  {
    fixture: 'operation-removed',
    ruleId: 'operation-removed',
    describes: 'an operation disappears',
  },
  {
    fixture: 'parameter-became-required',
    ruleId: 'parameter-became-required',
    describes: 'an optional query parameter becomes required',
  },
  {
    fixture: 'property-removed-from-response',
    ruleId: 'property-removed-from-response',
    describes: 'a response property disappears',
  },
  {
    fixture: 'enum-values-removed',
    ruleId: 'enum-values-removed',
    describes: 'a request enum drops an accepted value',
  },
  {
    fixture: 'nullability-changed',
    // Nullability rides on the type rule today; a dedicated id would be a refinement.
    ruleId: 'schema-type-changed',
    describes: 'a request property stops accepting null',
  },

  // ── not implemented yet
  {
    fixture: 'request-body-became-required',
    ruleId: 'request-body-became-required',
    describes: 'an optional request body becomes required',
  },
  {
    fixture: 'request-body-removed',
    ruleId: 'request-body-removed',
    describes: 'the request body disappears',
  },
  {
    fixture: 'string-length-changed',
    ruleId: 'string-length-changed',
    describes: 'maxLength shrinks on a request property',
  },
  {
    fixture: 'numeric-range-changed',
    ruleId: 'numeric-range-changed',
    describes: 'minimum rises on a request property',
  },
  {
    fixture: 'additional-properties-changed',
    ruleId: 'additional-properties-changed',
    describes: 'a request object stops accepting extra properties',
  },
  {
    fixture: 'schema-combinator-changed',
    ruleId: 'schema-combinator-changed',
    describes: 'a request oneOf drops an accepted subschema',
  },
  {
    fixture: 'schema-format-changed',
    ruleId: 'schema-format-changed',
    describes: 'a request property gains a format constraint',
  },
  {
    fixture: 'security-requirement-added',
    ruleId: 'security-requirement-added',
    describes: 'an open operation starts requiring authentication',
  },
  {
    fixture: 'security-scheme-changed',
    ruleId: 'security-scheme-changed',
    describes: 'a security scheme switches from apiKey to bearer',
  },
  {
    fixture: 'response-header-removed',
    ruleId: 'response-header-removed',
    describes: 'a response header disappears',
  },
  {
    fixture: 'parameter-serialization-changed',
    ruleId: 'parameter-serialization-changed',
    describes: 'an array parameter changes its serialization style',
  },
];

/** A change the command must NOT report as breaking. */
const SAFE: { fixture: string; describes: string }[] = [
  {
    fixture: 'schema-type-widened-in-request',
    describes: 'a request property accepts more types than before',
  },
  {
    fixture: 'nullable-equivalence-across-versions',
    describes: "3.0 `nullable: true` and 3.1 `type: [.., 'null']` describe the same schema",
  },
];

describe('diff rules', () => {
  for (const { fixture, ruleId, describes } of BREAKING) {
    test(`${ruleId}: reports breaking when ${describes}`, () => {
      const diff = runDiff(fixture);
      const change = diff.changes.find(
        (candidate) =>
          candidate.compat === 'breaking' &&
          candidate.verdicts?.some((verdict) => verdict.ruleId === ruleId)
      );

      expect(
        change,
        `expected a breaking change from '${ruleId}', got ${
          firedRuleIds(diff).join(', ') || 'no rule verdicts'
        } (breaking: ${diff.summary.breaking}, non-breaking: ${diff.summary.nonBreaking})`
      ).toBeDefined();
    });
  }

  for (const { fixture, describes } of SAFE) {
    test(`reports no breaking change when ${describes}`, () => {
      const diff = runDiff(fixture);

      expect(
        diff.summary.breaking,
        `expected no breaking changes, got ${diff.summary.breaking} from ${
          firedRuleIds(diff).join(', ') || 'no rule verdicts'
        }`
      ).toBe(0);
    });
  }
});
