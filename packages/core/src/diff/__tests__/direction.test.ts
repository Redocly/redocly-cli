import { directionsOf } from '../direction.js';
import { diffTreeOf, withReferences } from './utils.js';

describe('directionsOf for OpenAPI 3', () => {
  it('should read the direction off the place a node sits in', () => {
    const cafe = diffTreeOf(`
      #/ Root
      #/info Info
      #/paths Paths
      #/paths/~1orders PathItem
      #/paths/~1orders/get Operation
      #/paths/~1orders/get/parameters ParameterList
      #/paths/~1orders/get/parameters/0 Parameter
      #/paths/~1orders/get/responses Responses
      #/paths/~1orders/get/responses/200 Response
      #/paths/~1orders/post Operation
      #/paths/~1orders/post/requestBody RequestBody
    `);

    expect(directionsOf(cafe.get('#/paths/~1orders/get/parameters/0')!)).toEqual(['request']);
    expect(directionsOf(cafe.get('#/paths/~1orders/get/responses/200')!)).toEqual(['response']);
    expect(directionsOf(cafe.get('#/paths/~1orders/post/requestBody')!)).toEqual(['request']);
    expect(directionsOf(cafe.get('#/info')!)).toEqual([]);
  });

  it('should turn the direction round under a callback or a webhook, which the API sends', () => {
    const cafe = diffTreeOf(`
      #/ Root
      #/paths Paths
      #/paths/~1orders PathItem
      #/paths/~1orders/post Operation
      #/paths/~1orders/post/callbacks CallbacksMap
      #/paths/~1orders/post/callbacks/orderReady Callback
      #/paths/~1orders/post/callbacks/orderReady/url PathItem
      #/paths/~1orders/post/callbacks/orderReady/url/post Operation
      #/paths/~1orders/post/callbacks/orderReady/url/post/requestBody RequestBody
      #/webhooks WebhooksMap
      #/webhooks/menuChanged PathItem
      #/webhooks/menuChanged/post Operation
      #/webhooks/menuChanged/post/responses Responses
    `);
    const orderReadySent = cafe.get(
      '#/paths/~1orders/post/callbacks/orderReady/url/post/requestBody'
    )!;
    const menuChangedAnswer = cafe.get('#/webhooks/menuChanged/post/responses')!;

    expect(directionsOf(orderReadySent)).toEqual(['response']);
    expect(directionsOf(menuChangedAnswer)).toEqual(['request']);
  });

  it('should give a component the directions of the places that reach it, through other components', () => {
    const cafe = withReferences(
      diffTreeOf(`
        #/ Root
        #/paths Paths
        #/paths/~1orders PathItem
        #/paths/~1orders/get Operation
        #/paths/~1orders/get/responses Responses
        #/paths/~1orders/get/responses/200 Response
        #/paths/~1orders/post Operation
        #/paths/~1orders/post/requestBody RequestBody
        #/paths/~1menu PathItem
        #/paths/~1menu/get Operation
        #/paths/~1menu/get/responses Responses
        #/paths/~1menu/get/responses/200 Response
        #/components Components
        #/components/schemas NamedSchemas
        #/components/schemas/Order Schema
        #/components/schemas/Order/items Schema
        #/components/schemas/OrderItem Schema
        #/components/schemas/OrderItem/order Schema
        #/components/schemas/MenuItem Schema
        #/components/schemas/Dessert Schema
      `),
      [
        ['#/paths/~1orders/get/responses/200', '#/components/schemas/Order'],
        ['#/paths/~1orders/post/requestBody', '#/components/schemas/Order'],
        ['#/components/schemas/Order/items', '#/components/schemas/OrderItem'],
        ['#/components/schemas/OrderItem/order', '#/components/schemas/Order'],
        ['#/paths/~1menu/get/responses/200', '#/components/schemas/MenuItem'],
      ]
    );

    expect(directionsOf(cafe.get('#/components/schemas/Order')!)).toEqual(['request', 'response']);
    expect(directionsOf(cafe.get('#/components/schemas/OrderItem')!)).toEqual([
      'request',
      'response',
    ]);
    expect(directionsOf(cafe.get('#/components/schemas/MenuItem')!)).toEqual(['response']);
    expect(directionsOf(cafe.get('#/components/schemas/Dessert')!)).toEqual([]);
  });

  it('should read the direction off the place of a $ref when the component it points at says nothing', () => {
    const cafe = withReferences(
      diffTreeOf(`
        #/ Root
        #/paths Paths
        #/paths/~1orders PathItem
        #/paths/~1orders/post Operation
        #/paths/~1orders/post/requestBody RequestBody
        #/components Components
        #/components/requestBodies NamedRequestBodies
        #/components/requestBodies/NewOrder RequestBody
      `),
      [['#/paths/~1orders/post/requestBody', '#/components/requestBodies/NewOrder']]
    );

    expect(directionsOf(cafe.get('#/components/requestBodies/NewOrder')!)).toEqual(['request']);
  });

  it('should take readOnly as response data and writeOnly as request data wherever the schema is', () => {
    const cafe = diffTreeOf(`
      #/ Root
      #/paths Paths
      #/paths/~1orders PathItem
      #/paths/~1orders/post Operation
      #/paths/~1orders/post/requestBody RequestBody
      #/paths/~1orders/post/requestBody/schema Schema
      #/paths/~1orders/post/requestBody/schema/properties SchemaProperties
      #/paths/~1orders/post/requestBody/schema/properties/id Schema readOnly=true
      #/paths/~1orders/get Operation
      #/paths/~1orders/get/responses Responses
      #/paths/~1orders/get/responses/200 Response
      #/paths/~1orders/get/responses/200/schema Schema
      #/paths/~1orders/get/responses/200/schema/properties SchemaProperties
      #/paths/~1orders/get/responses/200/schema/properties/secret Schema writeOnly=true
    `);

    expect(directionsOf(cafe.get('#/paths/~1orders/post/requestBody/schema')!)).toEqual([
      'request',
    ]);
    expect(
      directionsOf(cafe.get('#/paths/~1orders/post/requestBody/schema/properties/id')!)
    ).toEqual(['response']);
    expect(directionsOf(cafe.get('#/paths/~1orders/get/responses/200/schema')!)).toEqual([
      'response',
    ]);
    expect(
      directionsOf(cafe.get('#/paths/~1orders/get/responses/200/schema/properties/secret')!)
    ).toEqual(['request']);
  });
});

describe('directionsOf for AsyncAPI 3', () => {
  it('should judge what an operation receives as a request and what it sends as a response', () => {
    const kitchen = withReferences(
      diffTreeOf(`
        #/ Root
        #/channels NamedChannels
        #/channels/orderPlaced Channel
        #/channels/orderReady Channel
        #/channels/menuChanged Channel
        #/operations NamedOperations
        #/operations/onOrderPlaced Operation action=receive
        #/operations/onOrderPlaced/channel Channel
        #/operations/sendOrderReady Operation action=send
        #/operations/sendOrderReady/channel Channel
      `),
      [
        ['#/operations/onOrderPlaced/channel', '#/channels/orderPlaced'],
        ['#/operations/sendOrderReady/channel', '#/channels/orderReady'],
      ]
    );

    expect(directionsOf(kitchen.get('#/channels/orderPlaced')!)).toEqual(['request']);
    expect(directionsOf(kitchen.get('#/channels/orderReady')!)).toEqual(['response']);
    expect(directionsOf(kitchen.get('#/channels/menuChanged')!)).toEqual([]);
  });

  it('should turn the direction round for the channel a reply travels on', () => {
    const kitchen = withReferences(
      diffTreeOf(`
        #/ Root
        #/channels NamedChannels
        #/channels/orderConfirmed Channel
        #/operations NamedOperations
        #/operations/onOrderPlaced Operation action=receive
        #/operations/onOrderPlaced/reply OperationReply
        #/operations/onOrderPlaced/reply/channel Channel
      `),
      [['#/operations/onOrderPlaced/reply/channel', '#/channels/orderConfirmed']]
    );

    expect(directionsOf(kitchen.get('#/channels/orderConfirmed')!)).toEqual(['response']);
  });

  it("should judge what the revision has in the revision's directions, and what only the base has in the base's", () => {
    const kitchen = withReferences(
      diffTreeOf(`
        #/ Root
        #/channels NamedChannels
        #/channels/orderReady Channel
        #/channels/orderReady/messages NamedMessages
        #/channels/orderReady/messages/orderReady Message
        #/operations NamedOperations
        #/operations/sendOrderReady Operation action=send
        #/operations/sendOrderReady/channel Channel
      `),
      [['#/operations/sendOrderReady/channel', '#/channels/orderReady']]
    );
    const sendOrderReady = kitchen.get('#/operations/sendOrderReady')!;
    sendOrderReady.revision = { ...sendOrderReady.revision!, value: { action: 'receive' } };
    const orderReady = kitchen.get('#/channels/orderReady/messages/orderReady')!;

    expect(directionsOf({ ...orderReady, revision: undefined })).toEqual(['response']);
    expect(directionsOf(orderReady)).toEqual(['request']);
  });

  it('should give a message the directions of both its channel and itself', () => {
    const kitchen = withReferences(
      diffTreeOf(`
        #/ Root
        #/channels NamedChannels
        #/channels/orders Channel
        #/channels/orders/messages NamedMessages
        #/channels/orders/messages/orderPlaced Message
        #/operations NamedOperations
        #/operations/onOrder Operation action=receive
        #/operations/onOrder/channel Channel
        #/operations/sendOrderPlaced Operation action=send
        #/operations/sendOrderPlaced/messages MessageList
        #/operations/sendOrderPlaced/messages/0 Message
      `),
      [
        ['#/operations/onOrder/channel', '#/channels/orders'],
        ['#/operations/sendOrderPlaced/messages/0', '#/channels/orders/messages/orderPlaced'],
      ]
    );

    expect(directionsOf(kitchen.get('#/channels/orders/messages/orderPlaced')!)).toEqual([
      'request',
      'response',
    ]);
  });
});
