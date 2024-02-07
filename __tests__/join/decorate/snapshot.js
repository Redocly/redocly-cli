// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join with options test with option: { name: 'decorate', value: true } 1`] = `

openapi: 3.0.0
info:
  title: Foo Example API
  description: This is an example API.
  version: 1.0.0
servers:
  - url: https://redocly-example.com/api
tags:
  - name: bar_other
    x-displayName: other
paths:
  /users/{userId}/orders/{orderId}:
    parameters:
      - name: userId
        in: path
        description: ID of the user
        required: true
        schema:
          type: integer
      - name: orderId
        in: path
        description: ID of the order
        required: true
        schema:
          type: integer
  /users/{userId}:
    parameters:
      - name: userId
        in: path
        description: ID of the user
        required: true
        schema:
          type: integer
    get:
      summary: Get user by ID
      responses:
        '200':
          description: OK
        '404':
          description: Not found
      tags:
        - bar_other
components: {}
x-tagGroups:
  - name: Bar Example API
    tags:
      - bar_other

openapi.yaml: join processed in <test>ms


`;
