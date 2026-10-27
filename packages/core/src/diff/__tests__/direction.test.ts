import { outdent } from 'outdent';

import { directionsOf } from '../direction.js';
import { changesBetween, diffNodeAt } from './utils.js';

describe('directionsOf for OpenAPI 3', () => {
  it('should read the direction off the place a node sits in', async () => {
    const cafe = outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          get:
            parameters:
              - { name: limit, in: query, schema: { type: integer } }
            responses:
              '200': { description: OK }
          post:
            requestBody:
              content: { application/json: { schema: { type: object } } }
            responses: {}
    `;

    expect(directionsOf(await diffNodeAt(cafe, '#/paths/~1orders/get/parameters/0'))).toEqual([
      'request',
    ]);
    expect(directionsOf(await diffNodeAt(cafe, '#/paths/~1orders/get/responses/200'))).toEqual([
      'response',
    ]);
    expect(directionsOf(await diffNodeAt(cafe, '#/paths/~1orders/post/requestBody'))).toEqual([
      'request',
    ]);
    expect(directionsOf(await diffNodeAt(cafe, '#/info'))).toEqual([]);
  });

  it('should turn the direction round under a callback or a webhook, which the API sends', async () => {
    const cafe = outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          post:
            responses: {}
            callbacks:
              orderReady:
                '{$request.body#/url}':
                  post:
                    requestBody:
                      content: { application/json: { schema: { type: object } } }
                    responses: {}
      webhooks:
        menuChanged:
          post:
            responses:
              '200': { description: OK }
    `;

    const orderReadySent = await diffNodeAt(
      cafe,
      '#/paths/~1orders/post/callbacks/orderReady/{$request.body#~1url}/post/requestBody'
    );
    const menuChangedAnswer = await diffNodeAt(cafe, '#/webhooks/menuChanged/post/responses/200');

    expect(directionsOf(orderReadySent)).toEqual(['response']);
    expect(directionsOf(menuChangedAnswer)).toEqual(['request']);
  });

  it('should give a component the directions of the places that reach it, through other components', async () => {
    const cafe = outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          get:
            responses:
              '200':
                description: OK
                content: { application/json: { schema: { $ref: '#/components/schemas/Order' } } }
          post:
            requestBody:
              content: { application/json: { schema: { $ref: '#/components/schemas/Order' } } }
            responses: {}
        /menu:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json: { schema: { $ref: '#/components/schemas/MenuItem' } }
      components:
        schemas:
          Order:
            type: object
            properties:
              items: { type: array, items: { $ref: '#/components/schemas/OrderItem' } }
          OrderItem:
            type: object
            properties:
              order: { $ref: '#/components/schemas/Order' }
          MenuItem: { type: object }
          Dessert: { type: object }
    `;

    expect(directionsOf(await diffNodeAt(cafe, '#/components/schemas/Order'))).toEqual([
      'request',
      'response',
    ]);
    expect(directionsOf(await diffNodeAt(cafe, '#/components/schemas/OrderItem'))).toEqual([
      'request',
      'response',
    ]);
    expect(directionsOf(await diffNodeAt(cafe, '#/components/schemas/MenuItem'))).toEqual([
      'response',
    ]);
    expect(directionsOf(await diffNodeAt(cafe, '#/components/schemas/Dessert'))).toEqual([]);
  });

  it('should read the direction off the place of a $ref when the component it points at says nothing', async () => {
    const cafe = outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          post:
            requestBody: { $ref: '#/components/requestBodies/NewOrder' }
            responses: {}
      components:
        requestBodies:
          NewOrder:
            content: { application/json: { schema: { type: object } } }
    `;

    expect(directionsOf(await diffNodeAt(cafe, '#/components/requestBodies/NewOrder'))).toEqual([
      'request',
    ]);
  });

  it('should take readOnly as response data and writeOnly as request data wherever the schema is', async () => {
    const cafe = outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          post:
            requestBody:
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      id: { type: string, readOnly: true }
            responses: {}
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        secret: { type: string, writeOnly: true }
    `;
    const requestSchema = '#/paths/~1orders/post/requestBody/content/application~1json/schema';
    const responseSchema = '#/paths/~1orders/get/responses/200/content/application~1json/schema';

    expect(directionsOf(await diffNodeAt(cafe, requestSchema))).toEqual(['request']);
    expect(directionsOf(await diffNodeAt(cafe, `${requestSchema}/properties/id`))).toEqual([
      'response',
    ]);
    expect(directionsOf(await diffNodeAt(cafe, responseSchema))).toEqual(['response']);
    expect(directionsOf(await diffNodeAt(cafe, `${responseSchema}/properties/secret`))).toEqual([
      'request',
    ]);
  });
});

describe('directionsOf for AsyncAPI 3', () => {
  it('should judge what an operation receives as a request and what it sends as a response', async () => {
    const kitchen = outdent`
      asyncapi: 3.0.0
      info: { title: Kitchen, version: 1.0.0 }
      channels:
        orderPlaced: { address: orders.placed }
        orderReady: { address: orders.ready }
        menuChanged: { address: menu.changed }
      operations:
        onOrderPlaced:
          action: receive
          channel: { $ref: '#/channels/orderPlaced' }
        sendOrderReady:
          action: send
          channel: { $ref: '#/channels/orderReady' }
    `;

    expect(directionsOf(await diffNodeAt(kitchen, '#/channels/orderPlaced'))).toEqual(['request']);
    expect(directionsOf(await diffNodeAt(kitchen, '#/channels/orderReady'))).toEqual(['response']);
    expect(directionsOf(await diffNodeAt(kitchen, '#/channels/menuChanged'))).toEqual([]);
  });

  it('should turn the direction round for the channel a reply travels on', async () => {
    const kitchen = outdent`
      asyncapi: 3.0.0
      info: { title: Kitchen, version: 1.0.0 }
      channels:
        orderPlaced: { address: orders.placed }
        orderConfirmed: { address: orders.confirmed }
      operations:
        onOrderPlaced:
          action: receive
          channel: { $ref: '#/channels/orderPlaced' }
          reply:
            channel: { $ref: '#/channels/orderConfirmed' }
    `;

    expect(directionsOf(await diffNodeAt(kitchen, '#/channels/orderConfirmed'))).toEqual([
      'response',
    ]);
  });

  it("should judge what the revision has in the revision's directions, and what only the base has in the base's", async () => {
    const kitchen = (action: string, messages: string) => outdent`
      asyncapi: 3.0.0
      info: { title: Kitchen, version: 1.0.0 }
      channels:
        orderReady:
          address: orders.ready
          messages: ${messages}
      operations:
        sendOrderReady:
          action: ${action}
          channel: { $ref: '#/channels/orderReady' }
    `;
    const withMessage = '{ orderReady: { payload: { type: object } } }';

    const [changedMessage] = await changesBetween(
      kitchen('send', withMessage),
      kitchen('receive', '{ orderReady: { payload: { type: object }, title: Ready } }')
    ).then((changes) => changes.filter((change) => change.path.endsWith('/orderReady')));
    const [removedMessage] = await changesBetween(
      kitchen('send', withMessage),
      kitchen('receive', '{}')
    ).then((changes) => changes.filter((change) => change.kind === 'removed'));

    expect(directionsOf(changedMessage.node)).toEqual(['request']);
    expect(directionsOf(removedMessage.node)).toEqual(['response']);
  });

  it('should give a message the directions of both its channel and itself', async () => {
    const kitchen = outdent`
      asyncapi: 3.0.0
      info: { title: Kitchen, version: 1.0.0 }
      channels:
        orders:
          address: orders
          messages:
            orderPlaced: { payload: { type: object } }
      operations:
        onOrder:
          action: receive
          channel: { $ref: '#/channels/orders' }
        sendOrderPlaced:
          action: send
          channel: { $ref: '#/channels/orders' }
          messages:
            - $ref: '#/channels/orders/messages/orderPlaced'
    `;

    expect(
      directionsOf(await diffNodeAt(kitchen, '#/channels/orders/messages/orderPlaced'))
    ).toEqual(['request', 'response']);
  });
});
