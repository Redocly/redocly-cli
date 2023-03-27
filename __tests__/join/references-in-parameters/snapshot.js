// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join without options test: references-in-parameters 1`] = `

openapi: 3.0.0
info:
  title: Example API
  description: This is an example API.
  version: 1.0.0
servers:
  - url: https://example.com/api
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
        - b_other
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
        - b_other
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
        - a_other
tags:
  - name: b_other
    x-displayName: other
  - name: a_other
    x-displayName: other
x-tagGroups:
  - name: b
    tags:
      - b_other
  - name: a
    tags:
      - a_other
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

openapi.yaml: join processed in <test>ms


`;
