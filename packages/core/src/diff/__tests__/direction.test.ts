import { mergeDirections } from '../direction.js';
import { async3Directions } from '../specs/async3.js';
import { oas3Directions } from '../specs/oas3.js';
import { directionsOfTree, treeOf } from './tree.js';

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
const resolveWithReferences = (edges: Array<[string, string]>) =>
  directionsOfTree(entries, edges, oas3Directions);
const unreferenced = resolveWithReferences([]);

describe('mergeDirections', () => {
  it('merges directions', () => {
    expect(mergeDirections([], ['request'])).toEqual(['request']);
    expect(mergeDirections(['request'], ['request'])).toEqual(['request']);
    expect(mergeDirections(['response'], ['request'])).toEqual(['request', 'response']);
  });
});

describe('getOas3Direction', () => {
  it('reads the direction off the node types on the way down', () => {
    expect(unreferenced(node('#/paths/~1p/get/responses/200'))).toEqual(['response']);
    expect(unreferenced(node('#/paths/~1p/get/parameters/{query:limit}/schema'))).toEqual([
      'request',
    ]);
    expect(unreferenced(node('#/paths/~1p/post/requestBody/content/application~1json'))).toEqual([
      'request',
    ]);
    expect(unreferenced(node('#/info/title'))).toEqual([]);
    expect(unreferenced(node('#/tags/{pets}'))).toEqual([]);
  });

  it('flips the direction under callbacks and webhooks', () => {
    // The API sends these, so their request body reaches the consumer like a response.
    expect(unreferenced(node('#/paths/~1p/post/callbacks/onEvent/~1cb/post/requestBody'))).toEqual([
      'response',
    ]);
    expect(unreferenced(node('#/webhooks/newPet/post/requestBody'))).toEqual(['response']);
    // ...and what the consumer answers with is a request.
    expect(unreferenced(node('#/webhooks/newPet/post/responses'))).toEqual(['request']);
  });

  it('is not fooled by properties named after a direction-bearing node', () => {
    // Both of these are `Schema` nodes; only their key looks like a context.
    expect(
      unreferenced(
        node('#/paths/~1p/post/requestBody/content/application~1json/schema/properties/responses')
      )
    ).toEqual(['request']);
    expect(
      unreferenced(
        node('#/paths/~1p/get/responses/200/content/application~1json/schema/properties/callbacks')
      )
    ).toEqual(['response']);
  });

  it('derives component direction from usage sites', () => {
    const directionOf = resolveWithReferences([
      [
        '#/paths/~1p/get/responses/200/content/application~1json/schema',
        '#/components/schemas/Pet',
      ],
    ]);
    expect(directionOf(node('#/components/schemas/Pet/properties/name'))).toEqual(['response']);
  });

  it('derives both when a component is used on both sides', () => {
    const directionOf = resolveWithReferences([
      [
        '#/paths/~1p/get/responses/200/content/application~1json/schema',
        '#/components/schemas/Pet',
      ],
      ['#/paths/~1p/post/requestBody/content/application~1json/schema', '#/components/schemas/Pet'],
    ]);
    expect(directionOf(node('#/components/schemas/Pet'))).toEqual(['request', 'response']);
  });

  it('resolves transitive usage through other components, cycle-safe', () => {
    const directionOf = resolveWithReferences([
      [
        '#/paths/~1p/get/responses/200/content/application~1json/schema',
        '#/components/schemas/Pet',
      ],
      ['#/components/schemas/Pet/properties/name', '#/components/schemas/Address'],
      // cycle back
      ['#/components/schemas/Address', '#/components/schemas/Pet'],
    ]);
    expect(directionOf(node('#/components/schemas/Address'))).toEqual(['response']);
  });

  it('returns neutral for unused components', () => {
    expect(unreferenced(node('#/components/schemas/Orphan'))).toEqual([]);
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
const asyncDirectionsOf = (edges: Array<[string, string]>) =>
  directionsOfTree(asyncEntries, edges, async3Directions);

describe('getAsync3Direction', () => {
  const directionOf = asyncDirectionsOf([
    ['#/operations/onSignup', '#/channels/signups'],
    ['#/operations/sendReceipt', '#/channels/receipts'],
    ['#/operations/onOrder/reply', '#/channels/orders'],
  ]);

  it('judges a received payload as a request and a sent one as a response', () => {
    // Another application produces what this one receives, so its payload is input.
    expect(directionOf(asyncNode('#/channels/signups/messages/signup/payload'))).toEqual([
      'request',
    ]);
    expect(directionOf(asyncNode('#/channels/receipts/messages/receipt'))).toEqual(['response']);
  });

  it('flips the direction for a reply channel', () => {
    expect(directionOf(asyncNode('#/channels/orders'))).toEqual(['response']);
  });

  it('reads the direction off the operation the change sits in', () => {
    expect(directionOf(asyncNode('#/operations/sendReceipt'))).toEqual(['response']);
  });

  it('returns neutral for a channel no operation references', () => {
    expect(asyncDirectionsOf([])(asyncNode('#/channels/signups'))).toEqual([]);
  });

  it('takes the direction of every referenced node it sits in', () => {
    const directionOf = asyncDirectionsOf([
      ['#/operations/onSignup', '#/channels/signups'],
      ['#/operations/sendReceipt', '#/channels/signups/messages/signup'],
    ]);
    expect(directionOf(asyncNode('#/channels/signups/messages/signup/payload'))).toEqual([
      'request',
      'response',
    ]);
  });

  it('does not hang on a payload that refers back into its own channel', () => {
    const recursive = asyncDirectionsOf([
      ['#/channels/signups/messages/signup/payload', '#/channels/signups'],
      ['#/channels/signups', '#/channels/signups/messages/signup/payload'],
    ]);
    expect(recursive(asyncNode('#/channels/signups/messages/signup'))).toEqual([]);
  });
});
