import { logger } from '@redocly/openapi-core';

import { CHECKS, DEFAULT_SEVERITY_CONFIGURATION } from '../../../checks/index.js';
import { checkCriteria } from '../../../flow-runner/success-criteria/check-success-criteria.js';

import type { TestContext, Step, RegexpSuccessCriteria } from '../../../../types.js';

describe('checkSuccessCriteria', () => {
  const stepMock: Step = {
    stepId: 'stepId',
    'x-operation': {
      method: 'get',
      url: 'http://localhost:3000/some/path',
    },
    checks: [],
    response: {
      body: {},
      statusCode: 200,
      header: {},
      contentType: 'application/json',
    },
  };
  it('should return empty array if successCriteria is empty', () => {
    const result = checkCriteria({
      workflowId: 'workflowId',
      step: stepMock,
      criteria: [],
      ctx: {
        arazzo: 'some spec',
        info: {
          title: 'some title',
          version: 'some version',
          description: 'some description',
        },
        workflows: [],
        $workflows: {
          workflowId: {
            steps: {
              stepId: {
                response: {
                  body: {},
                  code: 200,
                  headers: new Headers(),
                  contentType: 'application/json',
                },
                request: {
                  queryParams: {},
                  pathParams: {},
                  headerParams: {},
                  url: '',
                  path: '',
                  method: '',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: {},
                },
              },
            },
          },
        },
        descriptions: '',
        env: {},
        requests: {},
        responses: {},
        severity: DEFAULT_SEVERITY_CONFIGURATION,
        options: {
          logger,
        },
      } as unknown as TestContext,
    });
    expect(result).toEqual([]);
  });

  it('should return empty array if successCriteria is undefined', () => {
    const result = checkCriteria({
      workflowId: 'workflowId',
      step: stepMock,
      ctx: {
        arazzo: 'some spec',
        info: {
          title: 'some title',
          version: 'some version',
          description: 'some description',
        },
        workflows: [],
        $workflows: {
          workflowId: {
            steps: {
              stepId: {
                response: {
                  body: {},
                  code: 200,
                  headers: new Headers(),
                  contentType: 'application/json',
                },
                request: {
                  queryParams: {},
                  pathParams: {},
                  headerParams: {},
                  url: '',
                  path: '',
                  method: '',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: {},
                },
              },
            },
          },
        },
        descriptions: '',
        env: {},
        requests: {},
        responses: {},
        options: {
          logger,
        },
      } as unknown as TestContext,
    });
    expect(result).toEqual([]);
  });

  it('should process regex success criteria', () => {
    const stepMock: Step = {
      stepId: 'stepId',
      'x-operation': {
        method: 'get',
        url: 'http://localhost:3000/some/path',
      },
      checks: [],
      response: {
        body: {
          slug: 'organization-1',
          name: 'respect-test-project-name',
        },
        statusCode: 200,
        header: {},
        contentType: 'application/json',
      },
    };

    const result = checkCriteria({
      workflowId: 'workflowId',
      step: stepMock,
      criteria: [
        {
          type: 'regex',
          context: '$statusCode',
          condition: '^200$',
        },
        {
          type: 'regex',
          context: '$response.body#/slug',
          condition: '/^organization-1/i',
        },
        {
          type: 'regex',
          context: '$response.body#/name',
          condition: '/respect-test-project-name/',
        },
      ],
      ctx: {
        arazzo: 'some spec',
        info: {
          title: 'some title',
          version: 'some version',
          description: 'some description',
        },
        workflows: [],
        $workflows: {
          workflowId: {
            steps: {
              stepId: {
                response: {
                  body: {
                    slug: 'organization-1',
                  },
                  code: 200,
                  headers: new Headers(),
                  contentType: 'application/json',
                },
                request: {
                  queryParams: {},
                  pathParams: {},
                  headerParams: {},
                  url: '',
                  path: '',
                  method: '',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: {},
                },
              },
            },
          },
        },
        descriptions: '',
        env: {},
        requests: {},
        responses: {},
        severity: DEFAULT_SEVERITY_CONFIGURATION,
        options: {
          logger,
        },
      } as unknown as TestContext,
    });
    expect(result).toEqual([
      {
        message:
          'Checking regex criteria: {"type":"regex","context":"$statusCode","condition":"^200$"}',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '^200$',
      },
      {
        message:
          'Checking regex criteria: {"type":"regex","context":"$response.body#/slug","condition":"/^organization-1/i"}',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '/^organization-1/i',
      },
      {
        message:
          'Checking regex criteria: {"type":"regex","context":"$response.body#/name","condition":"/respect-test-project-name/"}',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '/respect-test-project-name/',
      },
    ]);
  });

  it('should process simple success criteria', () => {
    const stepMock: Step = {
      stepId: 'stepId',
      'x-operation': {
        method: 'get',
        url: 'http://localhost:3000/some/path',
      },
      checks: [],
      response: {
        body: {
          items: [
            {
              sourceId: 'rem_00h3hbrz9cce4drnctvtx62rzr',
            },
            {
              sourceId: 'rem_00h3hbrz9cce4drnctvtx62rzr',
            },
          ],
        },
        statusCode: 200,
        header: {},
        contentType: 'application/json',
      },
    };
    const result = checkCriteria({
      workflowId: 'workflowId',
      step: stepMock,
      criteria: [
        {
          condition: '$statusCode == 200',
        },
        {
          condition: '$response.body#/items/0/sourceId == "rem_00h3hbrz9cce4drnctvtx62rzr"',
        },
      ],
      ctx: {
        arazzo: 'some spec',
        info: {
          title: 'some title',
          version: 'some version',
          description: 'some description',
        },
        workflows: [],
        $workflows: {
          workflowId: {
            steps: {
              stepId: {
                response: {
                  body: {},
                  code: 200,
                  headers: new Headers(),
                  contentType: 'application/json',
                },
                request: {
                  queryParams: {},
                  pathParams: {},
                  headerParams: {},
                  url: '',
                  path: '',
                  method: '',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: {},
                },
              },
            },
          },
        },
        descriptions: '',
        env: {},
        requests: {},
        responses: {},
        severity: DEFAULT_SEVERITY_CONFIGURATION,
        options: {
          logger,
        },
      } as unknown as TestContext,
    });
    expect(result).toEqual([
      {
        message: 'Checking simple criteria: {"condition":"$statusCode == 200"}',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$statusCode == 200',
      },
      {
        message:
          'Checking simple criteria: {"condition":"$response.body#/items/0/sourceId == \\"rem_00h3hbrz9cce4drnctvtx62rzr\\""}',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$response.body#/items/0/sourceId == "rem_00h3hbrz9cce4drnctvtx62rzr"',
      },
    ]);
  });

  it('should pass composite jsonpath criteria (RFC 9535)', () => {
    const stepMock: Step = {
      stepId: 'stepId',
      'x-operation': { method: 'get', url: 'http://localhost:3000/some/path' },
      checks: [],
      response: {
        body: {
          received_headers: {
            'x-trace-id': 'A-AaAaa-Aaaa-AaAA-AaAaaAAaaA1',
            'content-length': 23,
            filledList: ['one', 'two', 'three'],
            emptyList: [],
          },
          pets: ['dog', 'cat', 'bunny'],
          someProp: 'someValue',
          users: [{ name: 'Alice Wonderland' }, { name: 'Bob Smith' }],
        },
        statusCode: 200,
        header: {},
        contentType: 'application/json',
      },
    } as unknown as Step;

    const result = checkCriteria({
      workflowId: 'workflowId',
      step: stepMock,
      criteria: [
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.pets[?length(@) > 0]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition:
            '$.received_headers[?(@.x-trace-id == "A-AaAaa-Aaaa-AaAA-AaAaaAAaaA1" && @.content_length == 23)]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.received_headers.filledList[?length(@) == 3]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          // property-style ".length" ❌ not in RFC 9535, but we support it for backwards compatibility
          condition: '$.received_headers.filledList.length == 3',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$[?count($.received_headers.*) >= 4]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.users[?value(@.name) == "Bob Smith"]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.received_headers[?(@.filledList.length > 2 && @.emptyList.length == 0)]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition:
            '$.pets.length == 3 && $.received_headers.filledList.length == 3 && $.someProp == "someValue"',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.users[?(@.name.search(/Alice/) >= 0)]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.users[?(@.name.match(/Alice Wonderland/))]',
        },
      ],
      ctx: {
        workflows: [],
        $workflows: {
          workflowId: {
            steps: {
              stepId: {
                response: {
                  body: {
                    received_headers: {
                      'x-trace-id': 'A-AaAaa-Aaaa-AaAA-AaAaaAAaaA1',
                      'content-length': 23,
                      filledList: ['one', 'two', 'three'],
                      emptyList: [],
                    },
                    pets: ['dog', 'cat', 'bunny'],
                    someProp: 'someValue',
                  },
                  code: 200,
                  headers: new Headers(),
                  contentType: 'application/json',
                },
                request: {
                  queryParams: {},
                  pathParams: {},
                  headerParams: {},
                  url: '',
                  path: '',
                  method: '',
                  headers: { 'content-type': 'application/json' },
                  body: {},
                },
              },
            },
          },
        },
        descriptions: '',
        $response: {
          body: {
            received_headers: {
              'x-trace-id': 'A-AaAaa-Aaaa-AaAA-AaAaaAAaaA1',
              'content-length': 23,
              filledList: ['one', 'two', 'three'],
              emptyList: [],
            },
            pets: ['dog', 'cat', 'bunny'],
            someProp: 'someValue',
          },
        },
        severity: DEFAULT_SEVERITY_CONFIGURATION,
        options: { logger },
      } as unknown as TestContext,
    });

    expect(result).toEqual([
      {
        message: 'Checking jsonpath criteria: $.pets[?length(@) > 0]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$.pets[?length(@) > 0]',
      },
      {
        message:
          'Checking jsonpath criteria: $.received_headers[?(@.x-trace-id == "A-AaAaa-Aaaa-AaAA-AaAaaAAaaA1" && @.content_length == 23)]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition:
          '$.received_headers[?(@.x-trace-id == "A-AaAaa-Aaaa-AaAA-AaAaaAAaaA1" && @.content_length == 23)]',
      },
      {
        message: 'Checking jsonpath criteria: $.received_headers.filledList[?length(@) == 3]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$.received_headers.filledList[?length(@) == 3]',
      },
      {
        message: 'Checking jsonpath criteria: $.received_headers.filledList.length == 3',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$.received_headers.filledList.length == 3',
      },
      {
        message: 'Checking jsonpath criteria: $[?count($.received_headers.*) >= 4]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$[?count($.received_headers.*) >= 4]',
      },
      {
        message: 'Checking jsonpath criteria: $.users[?value(@.name) == "Bob Smith"]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$.users[?value(@.name) == "Bob Smith"]',
      },
      {
        message:
          'Checking jsonpath criteria: $.received_headers[?(@.filledList.length > 2 && @.emptyList.length == 0)]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$.received_headers[?(@.filledList.length > 2 && @.emptyList.length == 0)]',
      },
      {
        message:
          'Checking jsonpath criteria: $.pets.length == 3 && $.received_headers.filledList.length == 3 && $.someProp == "someValue"',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition:
          '$.pets.length == 3 && $.received_headers.filledList.length == 3 && $.someProp == "someValue"',
      },
      {
        message: 'Checking jsonpath criteria: $.users[?(@.name.search(/Alice/) >= 0)]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$.users[?(@.name.search(/Alice/) >= 0)]',
      },
      {
        message: 'Checking jsonpath criteria: $.users[?(@.name.match(/Alice Wonderland/))]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$.users[?(@.name.match(/Alice Wonderland/))]',
      },
    ]);
  });

  it('should fail composite jsonpath criteria (RFC 9535)', () => {
    const stepMock: Step = {
      stepId: 'stepId',
      'x-operation': { method: 'get', url: 'http://localhost:3000/some/path' },
      checks: [],
      response: {
        body: {
          received_headers: {
            'x-trace-id': 'A-AaAaa-Aaaa-AaAA-AaAaaAAaaA1',
            'content-length': 23,
            filledList: ['one', 'two', 'three'],
            emptyList: [],
          },
          pets: ['dog', 'cat', 'bunny'],
          someProp: 'someValue',
          users: [{ name: 'Alice Wonderland' }, { name: 'Bob Smith' }],
        },
        statusCode: 200,
        header: {},
        contentType: 'application/json',
      },
    } as unknown as Step;

    const result = checkCriteria({
      workflowId: 'workflowId',
      step: stepMock,
      criteria: [
        {
          type: {
            type: 'jsonpath',
            version: 'draft-goessner-dispatch-jsonpath-00',
          },
          context: '$response.body',
          condition: '$.not_exists.length > 2',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.pets[?length(@) == 0]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition:
            '$.received_headers[?(@.x-trace-id == "B-AaAaa-Aaaa-AaAA-AaAaaAAaaA1" && @.content_length == 23)]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.received_headers.filledList[?length(@) == 1]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          // property-style ".length" ❌ not in RFC 9535, but we support it for backwards compatibility
          condition: '$.received_headers.filledList.length == 1',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$[?count($.received_headers.*) < 4]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.users[?value(@.name) == "Bob Wonderland"]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.received_headers[?(@.filledList.length > 2 && @.emptyList.length == 3)]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition:
            '$.pets.length == 2 && $.received_headers.filledList.length == 4 && $.someProp == "someValue"',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.users[?(@.name.search(/Sammy/) >= 0)]',
        },
        {
          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
          context: '$response.body',
          condition: '$.users[?(@.name.match(/Bob Wonderland/))]',
        },
      ],
      ctx: {
        workflows: [],
        $workflows: {
          workflowId: {
            steps: {
              stepId: {
                response: {
                  body: {
                    received_headers: {
                      'x-trace-id': 'A-AaAaa-Aaaa-AaAA-AaAaaAAaaA1',
                      'content-length': 23,
                      filledList: ['one', 'two', 'three'],
                      emptyList: [],
                    },
                    pets: ['dog', 'cat', 'bunny'],
                    someProp: 'someValue',
                  },
                  code: 200,
                  headers: new Headers(),
                  contentType: 'application/json',
                },
                request: {
                  queryParams: {},
                  pathParams: {},
                  headerParams: {},
                  url: '',
                  path: '',
                  method: '',
                  headers: { 'content-type': 'application/json' },
                  body: {},
                },
              },
            },
          },
        },
        descriptions: '',
        $response: {
          body: {
            received_headers: {
              'x-trace-id': 'A-AaAaa-Aaaa-AaAA-AaAaaAAaaA1',
              'content-length': 23,
              filledList: ['one', 'two', 'three'],
              emptyList: [],
            },
            pets: ['dog', 'cat', 'bunny'],
            someProp: 'someValue',
          },
        },
        severity: DEFAULT_SEVERITY_CONFIGURATION,
        options: { logger },
      } as unknown as TestContext,
    });

    expect(result).toEqual([
      {
        message: 'Checking jsonpath criteria: $.not_exists.length > 2',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$.not_exists.length > 2',
      },
      {
        message: 'Checking jsonpath criteria: $.pets[?length(@) == 0]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$.pets[?length(@) == 0]',
      },
      {
        message:
          'Checking jsonpath criteria: $.received_headers[?(@.x-trace-id == "B-AaAaa-Aaaa-AaAA-AaAaaAAaaA1" && @.content_length == 23)]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition:
          '$.received_headers[?(@.x-trace-id == "B-AaAaa-Aaaa-AaAA-AaAaaAAaaA1" && @.content_length == 23)]',
      },
      {
        message: 'Checking jsonpath criteria: $.received_headers.filledList[?length(@) == 1]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$.received_headers.filledList[?length(@) == 1]',
      },
      {
        message: 'Checking jsonpath criteria: $.received_headers.filledList.length == 1',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$.received_headers.filledList.length == 1',
      },
      {
        message: 'Checking jsonpath criteria: $[?count($.received_headers.*) < 4]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$[?count($.received_headers.*) < 4]',
      },
      {
        message: 'Checking jsonpath criteria: $.users[?value(@.name) == "Bob Wonderland"]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$.users[?value(@.name) == "Bob Wonderland"]',
      },
      {
        message:
          'Checking jsonpath criteria: $.received_headers[?(@.filledList.length > 2 && @.emptyList.length == 3)]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$.received_headers[?(@.filledList.length > 2 && @.emptyList.length == 3)]',
      },
      {
        message:
          'Checking jsonpath criteria: $.pets.length == 2 && $.received_headers.filledList.length == 4 && $.someProp == "someValue"',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition:
          '$.pets.length == 2 && $.received_headers.filledList.length == 4 && $.someProp == "someValue"',
      },
      {
        message: 'Checking jsonpath criteria: $.users[?(@.name.search(/Sammy/) >= 0)]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$.users[?(@.name.search(/Sammy/) >= 0)]',
      },
      {
        message: 'Checking jsonpath criteria: $.users[?(@.name.match(/Bob Wonderland/))]',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$.users[?(@.name.match(/Bob Wonderland/))]',
      },
    ]);
  });

  it('should return failed check', () => {
    const result = checkCriteria({
      workflowId: 'workflowId',
      step: stepMock,
      criteria: [
        {
          condition: '$statusCode === () => {throw new Error("error")}',
          type: 'not_exist',
        } as unknown as RegexpSuccessCriteria,
      ],
      ctx: {
        arazzo: 'some spec',
        info: {
          title: 'some title',
          version: 'some version',
          description: 'some description',
        },
        workflows: [],
        $workflows: {
          workflowId: {
            steps: {
              stepId: {
                response: {
                  body: {},
                  code: 200,
                  headers: new Headers(),
                  contentType: 'application/json',
                },
                request: {
                  queryParams: {},
                  pathParams: {},
                  headerParams: {},
                  url: '',
                  path: '',
                  method: '',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: {},
                },
              },
            },
          },
        },
        descriptions: '',
        env: {},
        requests: {},
        responses: {},
        severity: DEFAULT_SEVERITY_CONFIGURATION,
        options: {
          logger,
        },
      } as unknown as TestContext,
    });
    expect(result).toEqual([
      {
        message:
          'Failed to pass {"condition":"$statusCode === () => {throw new Error(\\"error\\")}","type":"not_exist"}: Runtime expression is not valid: $statusCode === () => {throw new Error("error")}',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$statusCode === () => {throw new Error("error")}',
      },
    ]);
  });

  it('should return failed check if workflowId is undefined', () => {
    const result = checkCriteria({
      workflowId: undefined,
      step: stepMock,
      criteria: [
        {
          condition: '$statusCode === () => {throw new Error("error")}',
          type: 'not_exist',
        } as unknown as RegexpSuccessCriteria,
      ],
      ctx: {
        arazzo: 'some spec',
        info: {
          title: 'some title',
          version: 'some version',
          description: 'some description',
        },
        workflows: [],
        $workflows: {
          workflowId: {
            steps: {
              stepId: {
                response: {
                  body: {},
                  code: 200,
                  headers: new Headers(),
                  contentType: 'application/json',
                },
                request: {
                  queryParams: {},
                  pathParams: {},
                  headerParams: {},
                  url: '',
                  path: '',
                  method: '',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: {},
                },
              },
            },
          },
        },
        descriptions: '',
        env: {},
        requests: {},
        responses: {},
        severity: DEFAULT_SEVERITY_CONFIGURATION,
        options: {
          logger,
        },
      } as unknown as TestContext,
    });
    expect(result).toEqual([
      {
        message: 'Undefined workflowId for step stepId',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
      },
    ]);
  });
});
