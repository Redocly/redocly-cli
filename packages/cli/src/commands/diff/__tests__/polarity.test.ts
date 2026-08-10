import type { NodeLookup } from '../engine/classify/chain.js';
import { getAsync3Polarity, getOas3Polarity } from '../engine/classify/polarity.js';
import { getComponentRoot, mergePolarity, UsageIndex } from '../engine/classify/usage.js';
import { treeOf } from './tree.js';

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
const tree: NodeLookup = (pointer) => entries.get(pointer);

const emptyUsage = new UsageIndex([], tree);

describe('getComponentRoot', () => {
  it('finds the component a node belongs to', () => {
    expect(getComponentRoot('#/components/schemas/Pet/properties/name', tree)).toBe(
      '#/components/schemas/Pet'
    );
    expect(getComponentRoot('#/components/schemas/Pet', tree)).toBe('#/components/schemas/Pet');
  });

  it('returns undefined outside components', () => {
    expect(getComponentRoot('#/paths/~1p/get', tree)).toBeUndefined();
  });
});

describe('mergePolarity', () => {
  it('merges polarities', () => {
    expect(mergePolarity('neutral', 'request')).toBe('request');
    expect(mergePolarity('request', 'request')).toBe('request');
    expect(mergePolarity('request', 'response')).toBe('both');
    expect(mergePolarity('both', 'response')).toBe('both');
  });
});

describe('getOas3Polarity', () => {
  it('reads the direction off the node types on the way down', () => {
    expect(getOas3Polarity('#/paths/~1p/get/responses/200', emptyUsage, tree)).toBe('response');
    expect(
      getOas3Polarity('#/paths/~1p/get/parameters/{query:limit}/schema', emptyUsage, tree)
    ).toBe('request');
    expect(
      getOas3Polarity('#/paths/~1p/post/requestBody/content/application~1json', emptyUsage, tree)
    ).toBe('request');
    expect(getOas3Polarity('#/info/title', emptyUsage, tree)).toBe('neutral');
    expect(getOas3Polarity('#/tags/{pets}', emptyUsage, tree)).toBe('neutral');
  });

  it('flips the direction under callbacks and webhooks', () => {
    // The API sends these, so their request body reaches the consumer like a response.
    expect(
      getOas3Polarity('#/paths/~1p/post/callbacks/onEvent/~1cb/post/requestBody', emptyUsage, tree)
    ).toBe('response');
    expect(getOas3Polarity('#/webhooks/newPet/post/requestBody', emptyUsage, tree)).toBe(
      'response'
    );
    // ...and what the consumer answers with is a request.
    expect(getOas3Polarity('#/webhooks/newPet/post/responses', emptyUsage, tree)).toBe('request');
  });

  it('is not fooled by properties named after a direction-bearing node', () => {
    // Both of these are `Schema` nodes; only their key looks like a context.
    expect(
      getOas3Polarity(
        '#/paths/~1p/post/requestBody/content/application~1json/schema/properties/responses',
        emptyUsage,
        tree
      )
    ).toBe('request');
    expect(
      getOas3Polarity(
        '#/paths/~1p/get/responses/200/content/application~1json/schema/properties/callbacks',
        emptyUsage,
        tree
      )
    ).toBe('response');
  });

  it('derives component polarity from usage sites', () => {
    const usage = new UsageIndex(
      [
        {
          site: '#/paths/~1p/get/responses/200/content/application~1json/schema',
          target: '#/components/schemas/Pet',
        },
      ],
      tree
    );
    expect(getOas3Polarity('#/components/schemas/Pet/properties/name', usage, tree)).toBe(
      'response'
    );
  });

  it('derives both when a component is used on both sides', () => {
    const usage = new UsageIndex(
      [
        {
          site: '#/paths/~1p/get/responses/200/content/application~1json/schema',
          target: '#/components/schemas/Pet',
        },
        {
          site: '#/paths/~1p/post/requestBody/content/application~1json/schema',
          target: '#/components/schemas/Pet',
        },
      ],
      tree
    );
    expect(getOas3Polarity('#/components/schemas/Pet', usage, tree)).toBe('both');
  });

  it('resolves transitive usage through other components, cycle-safe', () => {
    const usage = new UsageIndex(
      [
        {
          site: '#/paths/~1p/get/responses/200/content/application~1json/schema',
          target: '#/components/schemas/Pet',
        },
        {
          site: '#/components/schemas/Pet/properties/name',
          target: '#/components/schemas/Address',
        },
        // cycle back
        { site: '#/components/schemas/Address', target: '#/components/schemas/Pet' },
      ],
      tree
    );
    expect(getOas3Polarity('#/components/schemas/Address', usage, tree)).toBe('response');
  });

  it('returns neutral for unused components', () => {
    expect(getOas3Polarity('#/components/schemas/Orphan', emptyUsage, tree)).toBe('neutral');
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
const asyncTree: NodeLookup = (pointer) => asyncEntries.get(pointer);

describe('getAsync3Polarity', () => {
  const usage = new UsageIndex(
    [
      { site: '#/operations/onSignup', target: '#/channels/signups' },
      { site: '#/operations/sendReceipt', target: '#/channels/receipts' },
      { site: '#/operations/onOrder/reply', target: '#/channels/orders' },
    ],
    asyncTree
  );

  it('judges a received payload as a request and a sent one as a response', () => {
    // Another application produces what this one receives, so its payload is input.
    expect(getAsync3Polarity('#/channels/signups/messages/signup/payload', usage, asyncTree)).toBe(
      'request'
    );
    expect(getAsync3Polarity('#/channels/receipts/messages/receipt', usage, asyncTree)).toBe(
      'response'
    );
  });

  it('flips the direction for a reply channel', () => {
    expect(getAsync3Polarity('#/channels/orders', usage, asyncTree)).toBe('response');
  });

  it('reads the direction off the operation the change sits in', () => {
    expect(getAsync3Polarity('#/operations/sendReceipt', usage, asyncTree)).toBe('response');
  });

  it('returns neutral for a channel no operation references', () => {
    expect(getAsync3Polarity('#/channels/signups', new UsageIndex([], asyncTree), asyncTree)).toBe(
      'neutral'
    );
  });

  it('does not hang on a payload that refers back into its own channel', () => {
    const recursive = new UsageIndex(
      [
        { site: '#/channels/signups/messages/signup/payload', target: '#/channels/signups' },
        { site: '#/channels/signups', target: '#/channels/signups/messages/signup/payload' },
      ],
      asyncTree
    );
    expect(getAsync3Polarity('#/channels/signups/messages/signup', recursive, asyncTree)).toBe(
      'neutral'
    );
  });
});
