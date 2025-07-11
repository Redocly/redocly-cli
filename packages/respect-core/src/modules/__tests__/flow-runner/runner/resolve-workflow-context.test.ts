import { resolveWorkflowContext, createTestContext } from '../../../flow-runner/index.js';
import { ApiFetcher } from '../../../../utils/api-fetcher.js';
import { createConfig } from '@redocly/openapi-core';

vi.mock('../../../flow-runner/context/create-test-context.js');

describe('resolveWorkflowContext', async () => {
  const config = await createConfig({});
  const workflowId = '$sourceDescriptions.tickets-from-museum-api.workflows.get-museum-tickets';
  const apiClient = new ApiFetcher({});
  const resolvedWorkflow = {
    workflowId: 'get-museum-tickets',
    description: 'This workflow demonstrates how to buy tickets for the museum.',
    parameters: [
      {
        in: 'header',
        name: 'Authorization',
        value: 'Basic Og==',
      },
    ],
    steps: [
      {
        stepId: 'buy-tickets',
        description:
          'Buy museum tickets resolving request details with buyMuseumTickets operationId from museum-api.yaml description.',
        operationId: 'buyMuseumTickets',
        requestBody: {
          payload: {
            ticketType: 'general',
            ticketDate: '2023-09-07',
            email: 'todd@example.com',
          },
        },
        successCriteria: [
          {
            condition: '$statusCode == 201',
          },
        ],
        outputs: {
          ticketId: '$response.body.ticketId',
        },
      },
    ],
    outputs: {
      ticketId: '$steps.buy-tickets.outputs.ticketId',
    },
  } as any;
  const commonCtx = {
    sourceDescriptions: [
      { name: 'museum-api', type: 'openapi', url: 'museum-api.yaml' },
      {
        name: 'tickets-from-museum-api',
        type: 'arazzo',
        url: 'museum-tickets.yaml',
      },
    ],
    $sourceDescriptions: {
      'local-api': {},
      'museum-api': {
        paths: {
          '/museum-hours': {
            get: {
              summary: 'Get museum hours',
              description: 'Get upcoming museum operating hours.',
              operationId: 'getMuseumHours',
              tags: ['Operations'],
              parameters: [
                {
                  name: 'startDate',
                  in: 'query',
                  description:
                    "Starting date to retrieve future operating hours from. Defaults to today's date.",
                  schema: {
                    type: 'string',
                    format: 'date',
                    example: '2023-02-23',
                  },
                },
                {
                  name: 'page',
                  in: 'query',
                  description: 'Page number to retrieve.',
                  schema: {
                    type: 'integer',
                    default: 1,
                    example: 2,
                  },
                },
                {
                  name: 'limit',
                  in: 'query',
                  description: 'Number of days per page.',
                  schema: {
                    type: 'integer',
                    default: 10,
                    maximum: 30,
                    example: 15,
                  },
                },
              ],
              responses: {
                '200': {
                  description: 'Success.',
                  content: {
                    'application/json': {
                      schema: {
                        description: 'List of museum operating hours for consecutive days.',
                        type: 'array',
                        items: {
                          description: 'Daily operating hours for the museum.',
                          type: 'object',
                          properties: {
                            date: {
                              description: 'Date the operating hours apply to.',
                              example: '2024-12-31',
                              type: 'string',
                              format: 'date',
                            },
                            timeOpen: {
                              type: 'string',
                              pattern: '^([01]\\d|2[0-3]):?([0-5]\\d)$',
                              description:
                                'Time the museum opens on a specific date. Uses 24 hour time format (`HH:mm`).',
                              example: '09:00',
                            },
                            timeClose: {
                              description:
                                'Time the museum closes on a specific date. Uses 24 hour time format (`HH:mm`).',
                              type: 'string',
                              pattern: '^([01]\\d|2[0-3]):?([0-5]\\d)$',
                              example: '18:00',
                            },
                          },
                          required: ['date', 'timeOpen', 'timeClose'],
                        },
                      },
                      examples: {
                        default_example: {
                          summary: 'Get hours response',
                          value: [
                            {
                              date: '2023-09-11',
                              timeOpen: '09:00',
                              timeClose: '18:00',
                            },
                            {
                              date: '2023-09-12',
                              timeOpen: '09:00',
                              timeClose: '18:00',
                            },
                            {
                              date: '2023-09-13',
                              timeOpen: '09:00',
                              timeClose: '18:00',
                            },
                            {
                              date: '2023-09-14',
                              timeOpen: '09:00',
                              timeClose: '18:00',
                            },
                            {
                              date: '2023-09-15',
                              timeOpen: '10:00',
                              timeClose: '16:00',
                            },
                            {
                              date: '2023-09-18',
                              timeOpen: '09:00',
                              timeClose: '18:00',
                            },
                            {
                              date: '2023-09-19',
                              timeOpen: '09:00',
                              timeClose: '18:00',
                            },
                            {
                              date: '2023-09-20',
                              timeOpen: '09:00',
                              timeClose: '18:00',
                            },
                            {
                              date: '2023-09-21',
                              timeOpen: '09:00',
                              timeClose: '18:00',
                            },
                            {
                              date: '2023-09-22',
                              timeOpen: '10:00',
                              timeClose: '16:00',
                            },
                          ],
                        },
                      },
                    },
                  },
                },
                '400': {
                  description: 'Bad request.',
                  content: {
                    'application/problem+json': {
                      schema: {
                        type: 'object',
                        properties: {
                          type: {
                            type: 'string',
                            example: 'object',
                          },
                          title: {
                            type: 'string',
                            example: 'Validation failed',
                          },
                        },
                      },
                    },
                  },
                },
                '404': {
                  description: 'Not found.',
                  content: {
                    'application/problem+json': {
                      schema: {
                        type: 'object',
                        properties: {
                          type: {
                            type: 'string',
                            example: 'object',
                          },
                          title: {
                            type: 'string',
                            example: 'Validation failed',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        servers: [
          {
            url: 'https://redocly.com/_mock/docs/openapi/museum-api/',
          },
        ],
        info: {
          title: 'Redocly Museum API',
          description:
            'Imaginary, but delightful Museum API for interacting with museum services and information. Built with love by Redocly.',
          version: '1.1.1',
          termsOfService: 'https://redocly.com/subscription-agreement/',
          contact: {
            email: 'team@redocly.com',
            url: 'https://redocly.com/docs/cli/',
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/license/mit/',
          },
        },
      },
      'tickets-from-museum-api': {
        arazzo: '1.0.1',
        info: {
          title: 'Redocly Museum API Tickets',
          description:
            'A part of imaginary, but delightful Museum API for interacting with museum services and information. Built with love by Redocly.',
          version: '1.0.0',
        },
        sourceDescriptions: [
          {
            name: 'museum-api',
            type: 'openapi',
            url: 'museum-api.yaml',
          },
        ],
        workflows: [
          {
            workflowId: 'get-museum-tickets',
            description: 'This workflow demonstrates how to buy tickets for the museum.',
            parameters: [
              {
                in: 'header',
                name: 'Authorization',
                value: 'Basic Og==',
              },
            ],
            steps: [
              {
                stepId: 'buy-tickets',
                description:
                  'Buy museum tickets resolving request details with buyMuseumTickets operationId from museum-api.yaml description.',
                operationId: 'buyMuseumTickets',
                requestBody: {
                  payload: {
                    ticketType: 'general',
                    ticketDate: '2023-09-07',
                    email: 'todd@example.com',
                  },
                },
                successCriteria: [
                  {
                    condition: '$statusCode == 201',
                  },
                ],
                outputs: {
                  ticketId: '$response.body.ticketId',
                },
              },
            ],
            outputs: {
              ticketId: '$steps.buy-tickets.outputs.ticketId',
            },
          },
        ],
        components: {},
      },
    },
    options: {
      workflowPath: 'examples/museum-api/museum-api-test.yaml',
      workflow: undefined,
      skip: undefined,
      verbose: undefined,
      metadata: {
        _: ['run'],
        files: ['examples/museum-api/museum-api-test.yaml'],
        $0: 'respect',
        file: 'examples/museum-api/museum-api-test.yaml',
      },
      input: undefined,
      executionTimeout: 3_600_000,
      maxSteps: 2000,
      maxFetchTimeout: 40_000,
      config,
    },
    apiClient,
  } as any;

  it('should not createTestContext with the correct parameters when sourceDescriptionId is undefined', async () => {
    const apiClient = new ApiFetcher({});
    const workflowId = undefined;
    const resolvedWorkflow = {} as any;
    const ctx = {
      $sourceDescriptions: {},
      options: {},
      testDescription: {},
      apiClient,
      executedSteps: [],
    } as any;

    await resolveWorkflowContext(workflowId, resolvedWorkflow, ctx, config);

    expect(createTestContext).not.toHaveBeenCalled();
  });

  it('should call createTestContext with the correct parameters when sourceDescriptionId is defined for arazzo type', async () => {
    await resolveWorkflowContext(workflowId, resolvedWorkflow, commonCtx, config);

    expect(createTestContext).toHaveBeenCalledWith(
      commonCtx.$sourceDescriptions['tickets-from-museum-api'],
      {
        input: undefined,
        skip: undefined,
        workflow: ['get-museum-tickets'],
        workflowPath: expect.stringContaining('examples/museum-api/museum-tickets.yaml'),
        config,
        executionTimeout: 3_600_000,
        maxSteps: 2000,
        maxFetchTimeout: 40_000,
        server: undefined,
        severity: undefined,
        verbose: undefined,
      },
      apiClient
    );
  });

  it('should call createTestContext with empty workflowPath when there are no ctx.sourceDescriptions', async () => {
    const ctx = {
      ...commonCtx,
      ...{ sourceDescriptions: [] },
    } as any;

    await resolveWorkflowContext(workflowId, resolvedWorkflow, ctx, config);

    expect(createTestContext).toHaveBeenCalledWith(
      ctx.$sourceDescriptions['tickets-from-museum-api'],
      {
        input: undefined,
        skip: undefined,
        workflow: ['get-museum-tickets'],
        workflowPath: '',
        config,
        executionTimeout: 3_600_000,
        maxSteps: 2000,
        maxFetchTimeout: 40_000,
        server: undefined,
        severity: undefined,
        verbose: undefined,
      },
      apiClient
    );
  });

  it('should call createTestContext with the correct parameters when sourceDescriptionId is defined for openapi type', async () => {
    const workflowId = '$sourceDescriptions.museum-api';
    await resolveWorkflowContext(workflowId, resolvedWorkflow, commonCtx, config);

    expect(createTestContext).toHaveBeenCalledWith(
      commonCtx.$sourceDescriptions['museum-api'],
      {
        input: undefined,
        skip: undefined,
        workflow: ['get-museum-tickets'],
        workflowPath: 'museum-api.yaml',
        config,
        executionTimeout: 3_600_000,
        maxSteps: 2000,
        maxFetchTimeout: 40_000,
        server: undefined,
        severity: undefined,
        verbose: undefined,
      },
      apiClient
    );
  });

  it('should throw an error when sourceDescription.type is not openapi or arazzo', async () => {
    const localCtx = {
      ...commonCtx,
      sourceDescriptions: [
        { name: 'wrong-api', type: 'invalid', url: 'museum-api.yaml' },
        {
          name: 'tickets-from-museum-api',
          type: 'arazzo',
          url: 'museum-tickets.yaml',
        },
      ],
    } as any;
    const ctx = {
      ...localCtx,
      ...{
        $sourceDescriptions: {
          'wrong-api': {
            paths: {
              '/museum-hours': {
                get: {
                  summary: 'Get museum hours',
                  description: 'Get upcoming museum operating hours.',
                  operationId: 'getMuseumHours',
                  tags: ['Operations'],
                  parameters: [
                    {
                      name: 'startDate',
                      in: 'query',
                      description:
                        "Starting date to retrieve future operating hours from. Defaults to today's date.",
                      schema: {
                        type: 'string',
                        format: 'date',
                        example: '2023-02-23',
                      },
                    },
                    {
                      name: 'page',
                      in: 'query',
                      description: 'Page number to retrieve.',
                      schema: {
                        type: 'integer',
                        default: 1,
                        example: 2,
                      },
                    },
                    {
                      name: 'limit',
                      in: 'query',
                      description: 'Number of days per page.',
                      schema: {
                        type: 'integer',
                        default: 10,
                        maximum: 30,
                        example: 15,
                      },
                    },
                  ],
                  responses: {
                    '200': {
                      description: 'Success.',
                      content: {
                        'application/json': {
                          schema: {
                            description: 'List of museum operating hours for consecutive days.',
                            type: 'array',
                            items: {
                              description: 'Daily operating hours for the museum.',
                              type: 'object',
                              properties: {
                                date: {
                                  description: 'Date the operating hours apply to.',
                                  example: '2024-12-31',
                                  type: 'string',
                                  format: 'date',
                                },
                              },
                              required: ['date', 'timeOpen', 'timeClose'],
                            },
                          },
                          examples: {
                            default_example: {
                              summary: 'Get hours response',
                              value: [
                                {
                                  date: '2023-09-11',
                                  timeOpen: '09:00',
                                  timeClose: '18:00',
                                },
                              ],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            servers: [
              {
                url: 'https://redocly.com/_mock/docs/openapi/museum-api/',
              },
            ],
            info: {
              title: 'Redocly Museum API',
              description:
                'Imaginary, but delightful Museum API for interacting with museum services and information. Built with love by Redocly.',
              version: '1.1.1',
              termsOfService: 'https://redocly.com/subscription-agreement/',
              contact: {
                email: 'team@redocly.com',
                url: 'https://redocly.com/docs/cli/',
              },
              license: {
                name: 'MIT',
                url: 'https://opensource.org/license/mit/',
              },
            },
          },
        },
      },
    } as any;
    const workflowId = '$sourceDescriptions.wrong-api.workflows.get-museum-tickets';

    await expect(
      resolveWorkflowContext(workflowId, resolvedWorkflow, ctx, config)
    ).rejects.toThrowError('Unknown source description type invalid');
  });
});
