import type { RuntimeExpressionContext } from '../../../types.js';

import { logger } from '@redocly/openapi-core';
import { createFaker } from '../../faker.js';
import {
  evaluateRuntimeExpressionPayload,
  evaluateRuntimeExpression,
} from '../../runtime-expressions/index.js';

const faker = createFaker();
const runtimeExpressionContext = {
  $workflows: {
    workflow1: {
      $steps: {
        step1: {
          $outputs: {
            output1: 'output1Value',
          },
          request: {
            header: {
              accept: 'application/json, application/problem+json',
              authorization: 'Basic Og==',
              'content-type': 'application/json',
            },
            path: {},
            query: {},
            url: 'https://redocly.com/_mock/docs/openapi/museum-api//museum-hours',
            method: 'get',
          },
          response: {
            body: [
              {
                date: '2021-09-01',
                timeOpen: '09:00',
                timeClose: '17:00',
              },
            ],
            statusCode: 200,
            header: {
              'content-type': 'application/json',
              age: '0',
              'x-frame-options': 'deny',
            },
            path: {},
            query: {},
          },
        },
        step2: {
          outputs: {
            ticketId: '382c0820-0530-4f4b-99af-13811ad0f17a',
          },
        },
        'step-three': {
          outputs: {
            hardcoded: '125',
            name: 'close',
            createdEventId: 'dad4bce8-f5cb-4078-a211-995864315e39',
            fullBody: {
              eventid: 'dad4bce8-f5cb-4078-a211-995864315e39',
              name: 'Mermaid Treasure Identification and Analysis',
              location: 'Under the seaaa 🦀 🎶 🌊.',
              eventdescription:
                'Join us as we review and classify a rare collection of 20 thingamabobs, gadgets, gizmos, whoosits, and whatsits, kindly donated by Ariel.',
              dates: ['2023-12-15', '2023-12-22'],
              price: 0,
            },
          },
          request: {
            header: {
              'content-type': 'application/json',
              accept: 'application/json, application/problem+json',
              authorization: 'Basic Og==',
            },
            body: {
              test: '382c0820-0530-4f4b-99af-13811ad0f17a',
              name: 'Mermaid Treasure Identification and Analysis',
              location: 'Under the seaaa 🦀 🎶 🌊.',
              eventDescription:
                'Join us as we review and classify a rare collection of 20 thingamabobs, gadgets, gizmos, whoosits, and whatsits, kindly donated by Ariel.',
              dates: ['2023-12-15', '2023-12-22'],
              price: 0,
              booleanValue: true,
              multiwordSecret: 'Bearer 382c0820-0530-4f4b-99af-13811ad0f17a',
            },
            path: {},
            query: {},
            url: 'https://redocly.com/_mock/docs/openapi/museum-api//special-events',
            method: 'post',
          },
          response: {
            body: {
              eventId: 'dad4bce8-f5cb-4078-a211-995864315e39',
              name: 'Mermaid Treasure Identification and Analysis',
              location: 'Under the seaaa 🦀 🎶 🌊.',
              eventDescription:
                'Join us as we review and classify a rare collection of 20 thingamabobs, gadgets, gizmos, whoosits, and whatsits, kindly donated by Ariel.',
              dates: ['2023-12-15', '2023-12-22'],
              price: 0,
            },
            statusCode: 201,
            header: {
              'content-type': 'application/json',
              'x-xss-protection': '1;mode=block;',
            },
            query: {},
            path: {},
            requestHeaders: {
              'content-type': 'application/json',
              accept: 'application/json, application/problem+json',
              authorization: 'Basic Og==',
            },
          },
        },
      },
      outputs: {
        bodyCopy: {
          name: 'Mermaid Treasure Identification and Analysis',
        },
      },
    },
  },
  $sourceDescriptions: {},
  $faker: faker,
  $steps: {
    step1: {
      outputs: {
        output1: 'output1Value',
        bodyCopy: {
          name: 'Mermaid Treasure Identification and Analysis',
        },
      },
      request: {
        header: {
          accept: 'application/json, application/problem+json',
          authorization: 'Basic Og==',
          'content-type': 'application/json',
        },
        path: {},
        query: {},
        url: 'https://redocly.com/_mock/docs/openapi/museum-api//museum-hours',
        method: 'get',
      },
      response: {
        body: [
          {
            date: '2021-09-01',
            timeOpen: '09:00',
            timeClose: '17:00',
          },
        ],
        statusCode: 200,
        header: {
          'content-type': 'application/json',
          age: '0',
          'x-frame-options': 'deny',
        },
        path: {},
        query: {},
      },
    },
    'step-three': {
      outputs: {
        hardcoded: '125',
        name: 'close',
        createdEventId: 'dad4bce8-f5cb-4078-a211-995864315e39',
        fullBody: {
          eventid: 'dad4bce8-f5cb-4078-a211-995864315e39',
          name: 'Mermaid Treasure Identification and Analysis',
          location: 'Under the seaaa 🦀 🎶 🌊.',
          eventdescription:
            'Join us as we review and classify a rare collection of 20 thingamabobs, gadgets, gizmos, whoosits, and whatsits, kindly donated by Ariel.',
          dates: ['2023-12-15', '2023-12-22'],
          price: 0,
        },
      },
      request: {
        header: {
          'content-type': 'application/json',
          accept: 'application/json, application/problem+json',
          authorization: 'Basic Og==',
        },
        body: {
          test: '382c0820-0530-4f4b-99af-13811ad0f17a',
          name: 'Mermaid Treasure Identification and Analysis',
          location: 'Under the seaaa 🦀 🎶 🌊.',
          eventDescription:
            'Join us as we review and classify a rare collection of 20 thingamabobs, gadgets, gizmos, whoosits, and whatsits, kindly donated by Ariel.',
          dates: ['2023-12-15', '2023-12-22'],
          price: 0,
          booleanValue: true,
          multiwordSecret: 'Bearer 382c0820-0530-4f4b-99af-13811ad0f17a',
        },
        path: {},
        query: {},
        url: 'https://redocly.com/_mock/docs/openapi/museum-api//special-events',
        method: 'post',
      },
      response: {
        body: {
          eventId: 'dad4bce8-f5cb-4078-a211-995864315e39',
          name: 'Mermaid Treasure Identification and Analysis',
          location: 'Under the seaaa 🦀 🎶 🌊.',
          eventDescription:
            'Join us as we review and classify a rare collection of 20 thingamabobs, gadgets, gizmos, whoosits, and whatsits, kindly donated by Ariel.',
          dates: ['2023-12-15', '2023-12-22'],
          price: 0,
        },
        statusCode: 201,
        header: {
          connection: 'close',
          'content-type': 'application/json',
          date: 'Thu, 31 Oct 2024 09:25:29 GMT',
        },
        query: {},
        path: {},
        requestHeaders: {
          'content-type': 'application/json',
          accept: 'application/json, application/problem+json',
          authorization: 'Basic Og==',
        },
      },
    },
  },
  $response: {
    body: {
      eventId: 'dad4bce8-f5cb-4078-a211-995864315e39',
      name: 'Mermaid Treasure Identification and Analysis',
      location: 'Under the seaaa 🦀 🎶 🌊.',
      eventDescription: 'Join us as we review and classify a rare collection of 20 thingamabobs.',
      dates: ['2023-12-15', '2023-12-22'],
      price: 0,
      items: [],
      device_code: '123',
      piNumber: 3.14,
    },
    statusCode: 201,
    header: {
      'content-type': 'application/json',
      date: 'Thu, 31 Oct 2024 09:25:29 GMT',
      server: 'Caddy',
    },
    query: {},
    path: {},
  },
  $request: {
    header: {
      'content-type': 'application/json',
      accept: 'application/json, application/problem+json',
      authorization: 'Basic Og==',
    },
    body: {
      test: '382c0820-0530-4f4b-99af-13811ad0f17a',
      name: 'Mermaid Treasure Identification and Analysis',
      location: 'Under the seaaa 🦀 🎶 🌊.',
      eventDescription:
        'Join us as we review and classify a rare collection of 20 thingamabobs, gadgets, gizmos, whoosits, and whatsits, kindly donated by Ariel.',
      dates: ['2023-12-15', '2023-12-22'],
      price: 0,
      booleanValue: true,
      multiwordSecret: 'Bearer 382c0820-0530-4f4b-99af-13811ad0f17a',
    },
    path: {},
    query: {},
  },
  $outputs: {
    bodyCopy: {
      name: 'Mermaid Treasure Identification and Analysis',
    },
  },
  $inputs: {
    env: {
      AUTH_TOKEN: 'secret',
    },
  },
  $components: {},
  $url: 'http://example.com',
  $method: 'get',
  $statusCode: 200,
} as unknown as RuntimeExpressionContext;

describe('evaluateRuntimeExpressionPayload', () => {
  it('should evaluate string value', () => {
    const payload = 'foo';
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual('foo');
  });

  it('should evaluate number value', () => {
    const payload = 32;
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual(32);
  });

  it('should evaluate boolead value', () => {
    const payload = true;
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual(true);
  });

  it('should evaluate simple runtime expression value', () => {
    const payload = '$statusCode';
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual(200);
  });

  it('should evaluate simple runtime expression value with dash', () => {
    const payload = '$request.header.content-type';
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual('application/json');
  });
  it('should evaluate simple runtime expression value with dot notation', () => {
    const payload = '$steps.step-three.outputs.fullBody.dates.0';
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual('2023-12-15');
  });

  it('should evaluate $faker runtime expression value', () => {
    const payload = '$faker.number.integer({ min: 1, max: 10 })';
    expect(
      typeof evaluateRuntimeExpressionPayload({
        payload,
        context: runtimeExpressionContext,
        logger,
      })
    ).toBe('number');
  });

  it('should evaluate $faker inside string runtime expression value', () => {
    const payload = 'Some text {$faker.number.integer({ min: 1, max: 10 })}';
    expect(
      typeof evaluateRuntimeExpressionPayload({
        payload,
        context: runtimeExpressionContext,
        logger,
      })
    ).toBe('string');
  });

  it('should evaluate multiword runtime expression value', () => {
    const payload = 'Bearer {$steps.step-three.outputs.hardcoded}';
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual('Bearer 125');
  });

  it('should evaluate multiword runtime expression with JsonPointer value', () => {
    const payload = 'Bearer {$request.body#/multiwordSecret}';
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual('Bearer Bearer 382c0820-0530-4f4b-99af-13811ad0f17a');
  });

  it('should evaluate xml with runtime expression values', () => {
    const payload = `
        <?xml version="1.0"?>
        <Travelerinformation>
          <name>{$steps.step-three.response.body.location}</name>
          <email>{$steps.step-three.response.body.name}</email>
          <adderes>Usa</adderes>
        </Travelerinformation>`;
    expect(evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger }))
      .toEqual(`
        <?xml version="1.0"?>
        <Travelerinformation>
          <name>Under the seaaa 🦀 🎶 🌊.</name>
          <email>Mermaid Treasure Identification and Analysis</email>
          <adderes>Usa</adderes>
        </Travelerinformation>`);
  });

  it('should evaluate x-www-form-urlencoded string with runtime expression values', () => {
    const payload =
      'client_id={$steps.step-three.response.body.location}&grant_type={$steps.step-three.response.body.location}';
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual('client_id=Under the seaaa 🦀 🎶 🌊.&grant_type=Under the seaaa 🦀 🎶 🌊.');
  });

  it('should evaluate object runtime expression value', () => {
    const payload = '$response.body';
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual({
      eventId: 'dad4bce8-f5cb-4078-a211-995864315e39',
      name: 'Mermaid Treasure Identification and Analysis',
      location: 'Under the seaaa 🦀 🎶 🌊.',
      device_code: '123',
      eventDescription: 'Join us as we review and classify a rare collection of 20 thingamabobs.',
      dates: ['2023-12-15', '2023-12-22'],
      price: 0,
      items: [],
      piNumber: 3.14,
    });
  });

  it('should evaluate string runtime expression value', () => {
    const payload = '$response.body == "some string value"';
    const runtimeExpressionContext = {
      $response: {
        body: 'some string value',
      },
    } as unknown as RuntimeExpressionContext;
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual(`some string value == \"some string value\"`);
  });

  it('should evaluate runctime expressions with url comparison', () => {
    const payload = '$url == "http://example.com"';
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual(`http://example.com == \"http://example.com\"`);
  });

  it('should evaluate requestBody object with runtime expression values', () => {
    const payload = {
      test: '$response.body#/eventId',
      name: '$response.body#/name',
      dates: ['$steps.step-three.outputs.fullBody.dates.0'],
      price: 0,
      booleanValue: true,
      multiwordSecret: 'Bearer {$inputs.env.AUTH_TOKEN}',
    };
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual({
      test: 'dad4bce8-f5cb-4078-a211-995864315e39',
      name: 'Mermaid Treasure Identification and Analysis',
      dates: ['2023-12-15'],
      price: 0,
      booleanValue: true,
      multiwordSecret: 'Bearer secret',
    });
  });

  it('should evaluate properties with underscore in runtime expression values', () => {
    expect(
      evaluateRuntimeExpressionPayload({
        payload: '$response.body#/device_code',
        context: runtimeExpressionContext,
        logger,
      })
    ).toEqual('123');
  });

  it('should evaluate multipart/form-data payload ', () => {
    const payload = {
      name: 'test',
      singleFile: "$file('./test.yaml')",
      multipleFiles: ["$file('./logo.png')", "$file('./image.svg')"],
    };
    expect(
      evaluateRuntimeExpressionPayload({
        payload,
        context: runtimeExpressionContext,
        contentType: 'multipart/form-data',
        logger,
      })
    ).toEqual({
      multipleFiles: ['./logo.png', './image.svg'],
      name: 'test',
      singleFile: './test.yaml',
    });
  });

  it('should evaluate payload with different outputs access variations', () => {
    const payload = {
      name: '$outputs.bodyCopy#/name',
      name2: '$outputs.bodyCopy.name',
      name3: '$workflows.workflow1.outputs.bodyCopy#/name',
      name4: '$workflows.workflow1.outputs.bodyCopy.name',
      name5: '$steps.step1.outputs.bodyCopy.name',
      name6: '$steps.step1.outputs.bodyCopy#/name',
    };
    expect(
      evaluateRuntimeExpressionPayload({ payload, context: runtimeExpressionContext, logger })
    ).toEqual({
      name: 'Mermaid Treasure Identification and Analysis',
      name2: 'Mermaid Treasure Identification and Analysis',
      name3: 'Mermaid Treasure Identification and Analysis',
      name4: 'Mermaid Treasure Identification and Analysis',
      name5: 'Mermaid Treasure Identification and Analysis',
      name6: 'Mermaid Treasure Identification and Analysis',
    });
  });
});

describe('evaluateRuntimeExpression', () => {
  it('should evaluate string value', () => {
    const payload = 'foo';
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual('foo');
  });

  it('should evaluate number value', () => {
    const payload = 32;
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual(32);
  });

  it('should evaluate boolead value', () => {
    const payload = true;
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual(true);
  });

  it('should evaluate simple runtime expression value', () => {
    const payload = '$statusCode';
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual(200);
  });

  it('should evaluate simple runtime expression value with dash', () => {
    const payload = '$request.header.content-type';
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual(
      'application/json'
    );
  });

  it('should evaluate simple runtime expression with ! condition', () => {
    const payload = '$request.header.content-type != "application/xml"';
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual(true);
  });

  it('should evaluate simple runtime expression comparing undefined', () => {
    const payload = '$request.body#/test != undefined';
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual(true);
    expect(
      evaluateRuntimeExpression(
        '$request.body#/test == "382c0820-0530-4f4b-99af-13811ad0f17a"',
        runtimeExpressionContext,
        logger
      )
    ).toEqual(true);
    expect(
      evaluateRuntimeExpression('$request.body#/price == 0', runtimeExpressionContext, logger)
    ).toEqual(true);
  });

  it('should evaluate simple runtime expression comparing empty array', () => {
    expect(
      evaluateRuntimeExpression('$response.body#/items == []', runtimeExpressionContext, logger)
    ).toEqual(false);
  });

  it('should evaluate chained runtime expression value with dash', () => {
    const payload =
      '{$request.header.content-type == "application/json" && $statusCode == 200 || $steps.step-three.outputs.hardcoded != 125}';
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual(true);
  });

  it('should evaluate simple runtime expression value with dot notation', () => {
    const payload = '$steps.step-three.outputs.fullBody.dates.0';
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual(
      '2023-12-15'
    );
  });

  it('should evaluate $faker runtime expression value', () => {
    const payload = '$faker.number.integer({ min: 1, max: 10 })';
    expect(typeof evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toBe(
      'number'
    );
  });

  it('should evaluate $faker email runtime expression value', () => {
    const payload = '$faker.string.email({provider:"gmail"})';
    expect(typeof evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toBe(
      'string'
    );
  });

  it('should evaluate $faker runtime expression comparing numbers', () => {
    const payload = '$faker.number.integer({ min: 1, max: 10 }) < 20';
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toBe(true);
  });

  it('should evaluate $faker inside string runtime expression value', () => {
    const payload = 'Some text {$faker.number.integer({ min: 1, max: 10 })}';
    expect(typeof evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toBe(
      'string'
    );
  });

  it('should evaluete list runtime expression value', () => {
    const payload = ['foo', 'bar', '$statusCode'];
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual([
      'foo',
      'bar',
      200,
    ]);
  });

  it('should evaluate object runtime expression value', () => {
    const payload = {
      foo: 'bar',
      bar: '$statusCode',
    };
    expect(evaluateRuntimeExpression(payload, runtimeExpressionContext, logger)).toEqual({
      foo: 'bar',
      bar: 200,
    });
  });

  it('should evaluate runtime expression with case insensitive headers', () => {
    const expression =
      '$response.header.Content-Type == "application/json" && $response.header.coNTent-tYPe == "application/json"';
    expect(evaluateRuntimeExpression(expression, runtimeExpressionContext, logger)).toEqual(true);
  });

  it('should evaluate runtime expression with outputs', () => {
    const expression1 = '$outputs.bodyCopy#/name == "Mermaid Treasure Identification and Analysis"';
    const expression2 =
      '$workflows.workflow1.outputs.bodyCopy#/name == "Mermaid Treasure Identification and Analysis"';
    const expression3 =
      '$steps.step1.outputs.bodyCopy#/name == "Mermaid Treasure Identification and Analysis"';
    const expression4 = '$outputs.bodyCopy.name == "Mermaid Treasure Identification and Analysis"';
    const expression5 =
      '$workflows.workflow1.outputs.bodyCopy.name == "Mermaid Treasure Identification and Analysis"';
    const expression6 =
      '$steps.step1.outputs.bodyCopy.name == "Mermaid Treasure Identification and Analysis"';
    const expression7 = '$outputs.bodyCopy.name == $steps.step1.outputs.bodyCopy.name';

    expect(evaluateRuntimeExpression(expression1, runtimeExpressionContext, logger)).toEqual(true);
    expect(evaluateRuntimeExpression(expression2, runtimeExpressionContext, logger)).toEqual(true);
    expect(evaluateRuntimeExpression(expression3, runtimeExpressionContext, logger)).toEqual(true);
    expect(evaluateRuntimeExpression(expression5, runtimeExpressionContext, logger)).toEqual(true);
    expect(evaluateRuntimeExpression(expression6, runtimeExpressionContext, logger)).toEqual(true);
    expect(evaluateRuntimeExpression(expression7, runtimeExpressionContext, logger)).toEqual(true);
  });

  it('should evaluate runtime expression with float numbers', () => {
    const expression1 = '3.14 == 3.14';
    const expression2 = '3.14 == $response.body#/piNumber';
    const expression3 = '$response.body#/piNumber > 3.14';
    expect(evaluateRuntimeExpression(expression1, runtimeExpressionContext, logger)).toEqual(true);
    expect(evaluateRuntimeExpression(expression2, runtimeExpressionContext, logger)).toEqual(true);
    expect(evaluateRuntimeExpression(expression3, runtimeExpressionContext, logger)).toEqual(false);
  });
});
