// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E join without options test: ignore-decorators 1`] = `

openapi: 3.0.0
info:
  title: Example API
  description: This is an example API.
  version: 1.0.0
servers:
  - url: https://example.com/api
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
    get:
      x-private: true
      summary: Get an order by ID for a specific user
      responses:
        '200':
          description: OK
        '404':
          description: Not found
      tags:
        - foo_other
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
tags:
  - name: foo_other
    x-displayName: other
  - name: bar_other
    x-displayName: other
x-tagGroups:
  - name: foo
    tags:
      - foo_other
  - name: bar
    tags:
      - bar_other
components: {}

openapi.yaml: join processed in <test>ms


`;
