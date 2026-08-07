import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput, getCommandOutput, getParams } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

/** One fixture per rule, each a base/revision pair differing only in what it exercises. */
const BREAKING: { fixture: string; ruleId: string; describes: string }[] = [
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
    fixture: 'parameter-serialization-changed',
    ruleId: 'parameter-serialization-changed',
    describes: 'an array parameter changes its serialization style',
  },
  {
    fixture: 'property-removed-from-response',
    ruleId: 'property-removed-from-response',
    describes: 'a response property disappears',
  },
  {
    fixture: 'webhook-payload-property-removed',
    // A webhook body travels to the consumer, so it is judged as a response.
    ruleId: 'property-removed-from-response',
    describes: 'a webhook payload drops a property',
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
    fixture: 'schema-format-changed',
    ruleId: 'schema-format-changed',
    describes: 'a request property gains a format constraint',
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
    fixture: 'response-header-removed',
    ruleId: 'response-header-removed',
    describes: 'a response header disappears',
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
];

/** Changes that must not be reported as breaking. */
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

function runDiff(fixture: string): string {
  const args = getParams(indexEntryPoint, ['diff', 'base.yaml', 'revision.yaml']);
  return cleanupOutput(getCommandOutput(args, { testPath: join(__dirname, fixture) }));
}

describe('diff rules', () => {
  for (const { fixture, ruleId, describes } of BREAKING) {
    test(`${ruleId}: ${describes}`, async () => {
      const output = runDiff(fixture);
      // Named explicitly so a regenerated snapshot cannot quietly stop exercising the rule.
      expect(output).toContain(ruleId);
      await expect(output).toMatchFileSnapshot(join(__dirname, fixture, 'stylish-snapshot.txt'));
    });
  }

  for (const { fixture, describes } of SAFE) {
    test(`no breaking change when ${describes}`, async () => {
      const output = runDiff(fixture);
      expect(output).toContain('0 breaking');
      await expect(output).toMatchFileSnapshot(join(__dirname, fixture, 'stylish-snapshot.txt'));
    });
  }
});
