import { join } from 'node:path';

import { fixturePath, runDiff, runJsonDiff } from './helpers.js';

type RuleCase = { fixture: string; ruleId: string; describes: string };

/**
 * One fixture per rule, each a base/revision pair differing only in what it exercises.
 * A rule is registered per node type, so running the real command is the only way to
 * catch a rule wired to a type the walker never reports.
 */
const OPENAPI: RuleCase[] = [
  { fixture: 'oas3-path-removed', ruleId: 'path-removed', describes: 'a path disappears' },
  {
    fixture: 'oas3-operation-removed',
    ruleId: 'operation-removed',
    describes: 'an operation disappears',
  },
  {
    fixture: 'oas3-parameter-removed',
    ruleId: 'parameter-removed',
    describes: 'a query parameter disappears',
  },
  {
    fixture: 'oas3-parameter-removed-last',
    ruleId: 'parameter-removed',
    describes: 'the last parameter leaves with the whole `parameters` list',
  },
  {
    fixture: 'oas3-parameter-added-required',
    ruleId: 'parameter-added-required',
    describes: 'a new required query parameter appears',
  },
  {
    fixture: 'oas3-parameter-became-required',
    ruleId: 'parameter-became-required',
    describes: 'an optional query parameter becomes required',
  },
  {
    fixture: 'oas3-parameter-serialization-changed',
    ruleId: 'parameter-serialization-changed',
    describes: 'an array parameter changes its serialization style',
  },
  {
    fixture: 'oas3-response-removed',
    ruleId: 'response-removed',
    describes: 'a response disappears',
  },
  {
    fixture: 'oas3-response-header-removed',
    ruleId: 'response-header-removed',
    describes: 'a response header disappears',
  },
  {
    fixture: 'oas3-media-type-removed',
    ruleId: 'media-type-removed',
    describes: 'a response drops one of its media types',
  },
  {
    fixture: 'oas3-request-body-became-required',
    ruleId: 'request-body-became-required',
    describes: 'an optional request body becomes required',
  },
  {
    fixture: 'oas3-request-body-removed',
    ruleId: 'request-body-removed',
    describes: 'the request body disappears',
  },
  {
    fixture: 'oas3-property-removed-from-response',
    ruleId: 'property-removed-from-response',
    describes: 'a response property disappears',
  },
  {
    fixture: 'oas3-webhook-payload-property-removed',
    // A webhook body travels to the consumer, so it is judged as a response.
    ruleId: 'property-removed-from-response',
    describes: 'a webhook payload drops a property',
  },
  {
    fixture: 'oas3-required-properties-added',
    ruleId: 'required-properties-added',
    describes: 'a request payload requires one more property',
  },
  {
    fixture: 'oas3-required-properties-removed',
    ruleId: 'required-properties-removed',
    describes: 'a response property stops being required',
  },
  {
    fixture: 'oas3-enum-values-removed',
    ruleId: 'enum-values-removed',
    describes: 'a request enum drops an accepted value',
  },
  {
    fixture: 'oas3-enum-values-added',
    ruleId: 'enum-values-added',
    describes: 'a response enum gains a value',
  },
  {
    fixture: 'oas3-nullability-changed',
    // Nullability rides on the type rule today; a dedicated id would be a refinement.
    ruleId: 'schema-type-changed',
    describes: 'a request property stops accepting null',
  },
  {
    fixture: 'oas3-string-length-changed',
    ruleId: 'string-length-changed',
    describes: 'maxLength shrinks on a request property',
  },
  {
    fixture: 'oas3-numeric-range-changed',
    ruleId: 'numeric-range-changed',
    describes: 'minimum rises on a request property',
  },
  {
    fixture: 'oas3-schema-format-changed',
    ruleId: 'schema-format-changed',
    describes: 'a request property gains a format constraint',
  },
  {
    fixture: 'oas3-additional-properties-changed',
    ruleId: 'additional-properties-changed',
    describes: 'a request object stops accepting extra properties',
  },
  {
    fixture: 'oas3-schema-combinator-changed',
    ruleId: 'schema-combinator-changed',
    describes: 'a request oneOf drops an accepted subschema',
  },
  {
    fixture: 'oas3-ref-target-changed',
    ruleId: 'ref-target-changed',
    describes: 'a $ref points at another schema',
  },
  {
    fixture: 'oas3-security-requirement-added',
    ruleId: 'security-requirement-added',
    describes: 'an open operation starts requiring authentication',
  },
  {
    fixture: 'oas3-security-requirement-added-to-empty-list',
    ruleId: 'security-requirement-added',
    describes: 'an explicitly empty `security` list gets its first entry',
  },
  {
    fixture: 'oas3-security-scheme-changed',
    ruleId: 'security-scheme-changed',
    describes: 'a security scheme switches from apiKey to bearer',
  },
  {
    fixture: 'oas3-security-scheme-removed',
    ruleId: 'security-scheme-removed',
    describes: 'a security scheme disappears',
  },
  {
    fixture: 'oas3-security-scopes-added',
    ruleId: 'security-scopes-added',
    describes: 'a security requirement demands one more scope',
  },
];

/**
 * AsyncAPI 3 fixtures. The last two carry no AsyncAPI-specific rule: they prove that a
 * payload is judged by the schema rules, in the direction the operation's `action`
 * declares.
 */
const ASYNCAPI: RuleCase[] = [
  {
    fixture: 'async3-channel-removed',
    ruleId: 'channel-removed',
    describes: 'a channel disappears',
  },
  {
    fixture: 'async3-channel-address-changed',
    ruleId: 'channel-address-changed',
    describes: 'a channel moves to another address',
  },
  {
    fixture: 'async3-message-removed',
    ruleId: 'message-removed',
    describes: 'a channel drops one of its messages',
  },
  {
    fixture: 'async3-message-content-type-changed',
    ruleId: 'message-content-type-changed',
    describes: 'a message switches from JSON to Avro',
  },
  {
    fixture: 'async3-operation-action-changed',
    ruleId: 'operation-action-changed',
    describes: 'an operation starts sending where it used to receive',
  },
  {
    fixture: 'async3-server-removed',
    ruleId: 'server-removed',
    describes: 'a server disappears',
  },
  {
    fixture: 'async3-payload-required-added',
    ruleId: 'required-properties-added',
    describes: 'a received payload requires one more property',
  },
  {
    fixture: 'async3-payload-property-removed',
    ruleId: 'property-removed-from-response',
    describes: 'a sent payload drops a property',
  },
];

/**
 * Edits that must NOT be reported as breaking. Each one is the mirror of a rule above,
 * so a rule that stops reading the direction — or the polarity of the node — fails here
 * instead of passing everywhere.
 */
const NON_BREAKING: { fixture: string; describes: string }[] = [
  {
    fixture: 'oas3-parameter-added-optional',
    describes: 'a new optional query parameter appears',
  },
  {
    fixture: 'oas3-enum-values-added-to-request',
    describes: 'a request enum accepts one more value',
  },
  {
    fixture: 'oas3-schema-type-widened-in-request',
    describes: 'a request property accepts more types than before',
  },
  {
    fixture: 'oas3-nullable-equivalence-across-versions',
    describes: "3.0 `nullable: true` and 3.1 `type: [.., 'null']` describe the same schema",
  },
  {
    fixture: 'oas3-path-parameter-renamed',
    describes: 'a path parameter is renamed on both the path and the parameter',
  },
  {
    fixture: 'async3-sent-payload-required-added',
    describes: 'a sent payload requires one more property',
  },
];

describe('diff rules', () => {
  for (const { fixture, ruleId, describes } of [...OPENAPI, ...ASYNCAPI]) {
    test(`${ruleId}: ${describes}`, async () => {
      // The verdict is read off the machine-readable report, so a change of wording in
      // the terminal output cannot quietly stop the rule from being exercised.
      const breaking = runJsonDiff(fixture).changes.filter(
        (change) => change.compat === 'breaking'
      );
      expect(breaking.flatMap((change) => change.verdicts ?? []).map((v) => v.ruleId)).toContain(
        ruleId
      );

      await expect(runDiff(fixture)).toMatchFileSnapshot(
        join(fixturePath(fixture), 'snapshot.txt')
      );
    });
  }

  for (const { fixture, describes } of NON_BREAKING) {
    test(`no breaking change when ${describes}`, async () => {
      expect(runJsonDiff(fixture).summary.breaking).toBe(0);

      await expect(runDiff(fixture)).toMatchFileSnapshot(
        join(fixturePath(fixture), 'snapshot.txt')
      );
    });
  }
});
