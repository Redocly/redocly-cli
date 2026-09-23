import { async3Spec } from '../specs/async3.js';
import { mergeDirections } from '../specs/direction.js';
import { oas3Spec } from '../specs/oas3.js';
import { treeOf, usageOfTree } from './tree.js';

// One document covering every direction-bearing shape at once.
const entries = treeOf(`
  #/ Root
  #/info Info
  #/info/title scalar
  #/tags TagList
  #/tags/{pets} Tag
  #/paths PathsMap
  #/paths/~1p PathItem
  #/paths/~1p/get Operation
  #/paths/~1p/get/parameters ParameterList
  #/paths/~1p/get/parameters/{query:limit} Parameter
  #/paths/~1p/get/parameters/{query:limit}/schema Schema
  #/paths/~1p/get/responses Responses
  #/paths/~1p/get/responses/200 Response
  #/paths/~1p/get/responses/200/content MediaTypesMap
  #/paths/~1p/get/responses/200/content/application~1json MediaType
  #/paths/~1p/get/responses/200/content/application~1json/schema Schema
  #/paths/~1p/get/responses/200/content/application~1json/schema/properties SchemaProperties
  #/paths/~1p/get/responses/200/content/application~1json/schema/properties/callbacks Schema
  #/paths/~1p/post Operation
  #/paths/~1p/post/requestBody RequestBody
  #/paths/~1p/post/requestBody/content MediaTypesMap
  #/paths/~1p/post/requestBody/content/application~1json MediaType
  #/paths/~1p/post/requestBody/content/application~1json/schema Schema
  #/paths/~1p/post/requestBody/content/application~1json/schema/properties SchemaProperties
  #/paths/~1p/post/requestBody/content/application~1json/schema/properties/responses Schema
  #/paths/~1p/post/callbacks CallbacksMap
  #/paths/~1p/post/callbacks/onEvent Callback
  #/paths/~1p/post/callbacks/onEvent/~1cb PathItem
  #/paths/~1p/post/callbacks/onEvent/~1cb/post Operation
  #/paths/~1p/post/callbacks/onEvent/~1cb/post/requestBody RequestBody
  #/paths/~1p/post/callbacks/onEvent/~1cb/post/responses Responses
  #/webhooks WebhooksMap
  #/webhooks/newPet PathItem
  #/webhooks/newPet/post Operation
  #/webhooks/newPet/post/requestBody RequestBody
  #/webhooks/newPet/post/responses Responses
  #/components Components
  #/components/schemas NamedSchemas
  #/components/schemas/Pet Schema
  #/components/schemas/Pet/properties SchemaProperties
  #/components/schemas/Pet/properties/name Schema
  #/components/schemas/Address NamedSchemas
  #/components/schemas/Orphan Schema
`);
const node = (key: string) => entries.get(key)!;
const usageOf = (edges: Array<[string, string]>) => usageOfTree(entries, edges, oas3Spec);
const emptyUsage = usageOf([]);

describe('mergeDirections', () => {
  it('merges directions', () => {
    expect(mergeDirections('neutral', 'request')).toBe('request');
    expect(mergeDirections('request', 'request')).toBe('request');
    expect(mergeDirections('request', 'response')).toBe('both');
    expect(mergeDirections('both', 'response')).toBe('both');
  });
});

describe('getOas3Direction', () => {
  it('reads the direction off the node types on the way down', () => {
    expect(oas3Spec.directionOf(node('#/paths/~1p/get/responses/200'), emptyUsage)).toBe(
      'response'
    );
    expect(
      oas3Spec.directionOf(node('#/paths/~1p/get/parameters/{query:limit}/schema'), emptyUsage)
    ).toBe('request');
    expect(
      oas3Spec.directionOf(
        node('#/paths/~1p/post/requestBody/content/application~1json'),
        emptyUsage
      )
    ).toBe('request');
    expect(oas3Spec.directionOf(node('#/info/title'), emptyUsage)).toBe('neutral');
    expect(oas3Spec.directionOf(node('#/tags/{pets}'), emptyUsage)).toBe('neutral');
  });

  it('flips the direction under callbacks and webhooks', () => {
    // The API sends these, so their request body reaches the consumer like a response.
    expect(
      oas3Spec.directionOf(
        node('#/paths/~1p/post/callbacks/onEvent/~1cb/post/requestBody'),
        emptyUsage
      )
    ).toBe('response');
    expect(oas3Spec.directionOf(node('#/webhooks/newPet/post/requestBody'), emptyUsage)).toBe(
      'response'
    );
    // ...and what the consumer answers with is a request.
    expect(oas3Spec.directionOf(node('#/webhooks/newPet/post/responses'), emptyUsage)).toBe(
      'request'
    );
  });

  it('is not fooled by properties named after a direction-bearing node', () => {
    // Both of these are `Schema` nodes; only their key looks like a context.
    expect(
      oas3Spec.directionOf(
        node('#/paths/~1p/post/requestBody/content/application~1json/schema/properties/responses'),
        emptyUsage
      )
    ).toBe('request');
    expect(
      oas3Spec.directionOf(
        node('#/paths/~1p/get/responses/200/content/application~1json/schema/properties/callbacks'),
        emptyUsage
      )
    ).toBe('response');
  });

  it('derives component direction from usage sites', () => {
    const usage = usageOf([
      [
        '#/paths/~1p/get/responses/200/content/application~1json/schema',
        '#/components/schemas/Pet',
      ],
    ]);
    expect(oas3Spec.directionOf(node('#/components/schemas/Pet/properties/name'), usage)).toBe(
      'response'
    );
  });

  it('derives both when a component is used on both sides', () => {
    const usage = usageOf([
      [
        '#/paths/~1p/get/responses/200/content/application~1json/schema',
        '#/components/schemas/Pet',
      ],
      ['#/paths/~1p/post/requestBody/content/application~1json/schema', '#/components/schemas/Pet'],
    ]);
    expect(oas3Spec.directionOf(node('#/components/schemas/Pet'), usage)).toBe('both');
  });

  it('resolves transitive usage through other components, cycle-safe', () => {
    const usage = usageOf([
      [
        '#/paths/~1p/get/responses/200/content/application~1json/schema',
        '#/components/schemas/Pet',
      ],
      ['#/components/schemas/Pet/properties/name', '#/components/schemas/Address'],
      // cycle back
      ['#/components/schemas/Address', '#/components/schemas/Pet'],
    ]);
    expect(oas3Spec.directionOf(node('#/components/schemas/Address'), usage)).toBe('response');
  });

  it('returns neutral for unused components', () => {
    expect(oas3Spec.directionOf(node('#/components/schemas/Orphan'), emptyUsage)).toBe('neutral');
  });
});

// AsyncAPI states the direction on the operation, and channels live outside the
// operations, so a payload is reached through the channel that holds it.
const asyncEntries = treeOf(`
  #/ Root
  #/channels NamedChannels
  #/channels/signups Channel
  #/channels/signups/messages NamedMessages
  #/channels/signups/messages/signup Message
  #/channels/signups/messages/signup/payload Schema
  #/channels/receipts Channel
  #/channels/receipts/messages NamedMessages
  #/channels/receipts/messages/receipt Message
  #/channels/orders Channel
  #/operations NamedOperations
  #/operations/onSignup Operation action=receive
  #/operations/sendReceipt Operation action=send
  #/operations/onOrder Operation action=receive
  #/operations/onOrder/reply OperationReply
`);
const asyncNode = (key: string) => asyncEntries.get(key)!;
const asyncUsageOf = (edges: Array<[string, string]>) =>
  usageOfTree(asyncEntries, edges, async3Spec);

describe('getAsync3Direction', () => {
  const usage = asyncUsageOf([
    ['#/operations/onSignup', '#/channels/signups'],
    ['#/operations/sendReceipt', '#/channels/receipts'],
    ['#/operations/onOrder/reply', '#/channels/orders'],
  ]);

  it('judges a received payload as a request and a sent one as a response', () => {
    // Another application produces what this one receives, so its payload is input.
    expect(
      async3Spec.directionOf(asyncNode('#/channels/signups/messages/signup/payload'), usage)
    ).toBe('request');
    expect(async3Spec.directionOf(asyncNode('#/channels/receipts/messages/receipt'), usage)).toBe(
      'response'
    );
  });

  it('flips the direction for a reply channel', () => {
    expect(async3Spec.directionOf(asyncNode('#/channels/orders'), usage)).toBe('response');
  });

  it('reads the direction off the operation the change sits in', () => {
    expect(async3Spec.directionOf(asyncNode('#/operations/sendReceipt'), usage)).toBe('response');
  });

  it('returns neutral for a channel no operation references', () => {
    expect(async3Spec.directionOf(asyncNode('#/channels/signups'), asyncUsageOf([]))).toBe(
      'neutral'
    );
  });

  it('does not hang on a payload that refers back into its own channel', () => {
    const recursive = asyncUsageOf([
      ['#/channels/signups/messages/signup/payload', '#/channels/signups'],
      ['#/channels/signups', '#/channels/signups/messages/signup/payload'],
    ]);
    expect(async3Spec.directionOf(asyncNode('#/channels/signups/messages/signup'), recursive)).toBe(
      'neutral'
    );
  });
});
