// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join without options test: references-in-parameters 1`] = `

openapi: 3.0.0
info:
  title: Foo Example API
  description: This is an example API.
  version: 1.0.0
servers:
  - url: https://redocly-example.com/api
tags:
  - name: foo_other
    x-displayName: other
  - name: bar_other
    x-displayName: other
paths:
  /users/{userId}/products/{productId}:
    parameters:
      - $ref: '#/components/parameters/userIdParam'
      - $ref: '#/components/parameters/productIdParam'
    get:
      summary: Get a product by ID for a specific user
      responses:
        '200':
          description: OK
        '404':
          description: Not found
      tags:
        - foo_other
  /users/{userId}/orders/{orderId}/items/{itemId}:
    parameters:
      - $ref: '#/components/parameters/userIdParam'
      - $ref: '#/components/parameters/orderIdParam'
      - $ref: '#/components/parameters/itemIdParam'
    get:
      summary: Get an item by ID for a specific order and user
      responses:
        '200':
          description: OK
        '404':
          description: Not found
      tags:
        - foo_other
  /users/{userId}/orders/{orderId}:
    parameters:
      - $ref: '#/components/parameters/userIdParam'
      - $ref: '#/components/parameters/orderIdParam'
    get:
      summary: Get an order by ID for a specific user
      responses:
        '200':
          description: OK
        '404':
          description: Not found
      tags:
        - bar_other
components:
  parameters:
    userIdParam:
      name: userId
      in: path
      description: ID of the user
      required: true
      schema:
        type: integer
    productIdParam:
      name: productId
      in: path
      description: ID of the product
      required: true
      schema:
        type: integer
    orderIdParam:
      name: orderId
      in: path
      description: ID of the order
      required: true
      schema:
        type: integer
    itemIdParam:
      name: itemId
      in: path
      description: ID of the item
      required: true
      schema:
        type: integer
x-tagGroups:
  - name: Foo Example API
    tags:
      - foo_other
  - name: Bar Example API
    tags:
      - bar_other

openapi.yaml: join processed in <test>ms


`;
