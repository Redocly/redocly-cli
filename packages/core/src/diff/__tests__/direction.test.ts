import { async3Directions } from '../specs/async3.js';
import { oas3Directions } from '../specs/oas3.js';
import { directionsOfTree, treeOf } from './utils.js';

describe('resolveDirections for OpenAPI 3', () => {
  it('should read the direction off the place a node sits in', () => {
    const cafe = treeOf(`
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
    const statusFilter = cafe.get('#/paths/~1orders/get/parameters/0')!;
    const orderList = cafe.get('#/paths/~1orders/get/responses/200')!;
    const newOrder = cafe.get('#/paths/~1orders/post/requestBody')!;
    const info = cafe.get('#/info')!;

    const directionOf = directionsOfTree(cafe, [], oas3Directions);

    expect(directionOf(statusFilter)).toEqual(['request']);
    expect(directionOf(orderList)).toEqual(['response']);
    expect(directionOf(newOrder)).toEqual(['request']);
    expect(directionOf(info)).toEqual([]);
  });

  it('should turn the direction round under a callback or a webhook, which the API sends', () => {
    const cafe = treeOf(`
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

    const directionOf = directionsOfTree(cafe, [], oas3Directions);

    expect(directionOf(orderReadySent)).toEqual(['response']);
    expect(directionOf(menuChangedAnswer)).toEqual(['request']);
  });

  it('should give a component the directions of the places that reference it, through other components', () => {
    const cafe = treeOf(`
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
    `);
    const order = cafe.get('#/components/schemas/Order')!;
    const orderItem = cafe.get('#/components/schemas/OrderItem')!;
    const menuItem = cafe.get('#/components/schemas/MenuItem')!;
    const dessert = cafe.get('#/components/schemas/Dessert')!;

    const directionOf = directionsOfTree(
      cafe,
      [
        ['#/paths/~1orders/get/responses/200', '#/components/schemas/Order'],
        ['#/paths/~1orders/post/requestBody', '#/components/schemas/Order'],
        ['#/components/schemas/Order/items', '#/components/schemas/OrderItem'],
        ['#/components/schemas/OrderItem/order', '#/components/schemas/Order'],
        ['#/paths/~1menu/get/responses/200', '#/components/schemas/MenuItem'],
      ],
      oas3Directions
    );

    expect(directionOf(order)).toEqual(['request', 'response']);
    expect(directionOf(orderItem)).toEqual(['request', 'response']);
    expect(directionOf(menuItem)).toEqual(['response']);
    expect(directionOf(dessert)).toEqual([]);
  });
});

describe('resolveDirections for AsyncAPI 3', () => {
  it('should judge what an operation receives as a request and what it sends as a response', () => {
    const kitchen = treeOf(`
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
    `);
    const orderPlaced = kitchen.get('#/channels/orderPlaced')!;
    const orderReady = kitchen.get('#/channels/orderReady')!;
    const menuChanged = kitchen.get('#/channels/menuChanged')!;

    const directionOf = directionsOfTree(
      kitchen,
      [
        ['#/operations/onOrderPlaced/channel', '#/channels/orderPlaced'],
        ['#/operations/sendOrderReady/channel', '#/channels/orderReady'],
      ],
      async3Directions
    );

    expect(directionOf(orderPlaced)).toEqual(['request']);
    expect(directionOf(orderReady)).toEqual(['response']);
    expect(directionOf(menuChanged)).toEqual([]);
  });

  it('should turn the direction round for the channel a reply travels on', () => {
    const kitchen = treeOf(`
      #/ Root
      #/channels NamedChannels
      #/channels/orderConfirmed Channel
      #/operations NamedOperations
      #/operations/onOrderPlaced Operation action=receive
      #/operations/onOrderPlaced/reply OperationReply
      #/operations/onOrderPlaced/reply/channel Channel
    `);
    const orderConfirmed = kitchen.get('#/channels/orderConfirmed')!;

    const directionOf = directionsOfTree(
      kitchen,
      [['#/operations/onOrderPlaced/reply/channel', '#/channels/orderConfirmed']],
      async3Directions
    );

    expect(directionOf(orderConfirmed)).toEqual(['response']);
  });

  it('should give a message the directions of both its channel and itself', () => {
    const kitchen = treeOf(`
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
    `);
    const orderPlaced = kitchen.get('#/channels/orders/messages/orderPlaced')!;

    const directionOf = directionsOfTree(
      kitchen,
      [
        ['#/operations/onOrder/channel', '#/channels/orders'],
        ['#/operations/sendOrderPlaced/messages/0', '#/channels/orders/messages/orderPlaced'],
      ],
      async3Directions
    );

    expect(directionOf(orderPlaced)).toEqual(['request', 'response']);
  });
});
