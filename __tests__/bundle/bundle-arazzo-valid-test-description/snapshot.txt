info:
  title: Redocly Museum API Tickets
  description: A part of imaginary, but delightful Museum API for interacting with museum services and information. Built with love by Redocly.
  version: 1.0.0
components: {}
arazzo: 1.0.1
sourceDescriptions:
  - name: museum-api
    type: openapi
    url: museum-api.yaml
workflows:
  - workflowId: get-museum-tickets
    description: This workflow demonstrates how to buy tickets for the museum.
    parameters:
      - in: header
        name: Authorization
        value: Basic Og==
    steps:
      - stepId: buy-tickets
        description: Buy museum tickets resolving request details with buyMuseumTickets operationId from museum-api.yaml description.
        operationId: buyMuseumTickets
        requestBody:
          payload:
            ticketType: general
            ticketDate: '2023-09-07'
            email: todd@example.com
        successCriteria:
          - condition: $statusCode == 201
        outputs:
          ticketId: $response.body.ticketId
    outputs:
      ticketId: $steps.buy-tickets.outputs.ticketId

bundling museum.yaml...
📦 Created a bundle for museum.yaml at stdout <test>ms.
