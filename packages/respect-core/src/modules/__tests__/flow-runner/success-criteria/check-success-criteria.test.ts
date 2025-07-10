import { Headers } from 'undici';
import { logger } from '@redocly/openapi-core';

import type { TestContext, Step, RegexpSuccessCriteria } from '../../../../types.js';

import { checkCriteria } from '../../../flow-runner/success-criteria/check-success-criteria.js';
import { CHECKS, DEFAULT_SEVERITY_CONFIGURATION } from '../../../checks/index.js';

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
        harLogs: [],
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
        harLogs: [],
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
        harLogs: [],
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
        harLogs: [],
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

  it('should fail JSONPath success criteria', () => {
    const result = checkCriteria({
      workflowId: 'workflowId',
      step: stepMock,
      criteria: [
        {
          type: 'jsonpath',
          context: '$response.body',
          condition: '$.pets[?(@.length>3)] && $.access_token != null',
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
                    pets: [{ name: 'cat' }, { name: 'bunny' }],
                    access_token: 'some token',
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
        $response: {
          body: {
            pets: [{ name: 'cat' }, { name: 'bunny' }],
            access_token: 'some token',
          },
        },
        severity: DEFAULT_SEVERITY_CONFIGURATION,
        options: {
          logger,
        },
      } as unknown as TestContext,
    });
    expect(result).toEqual([
      {
        message: 'Checking jsonpath criteria: $.pets[?(@.length>3)] && $.access_token != null',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$.pets[?(@.length>3)] && $.access_token != null',
      },
    ]);
  });

  it('should pass jsonpath success criteria', () => {
    const stepMock: Step = {
      stepId: 'stepId',
      'x-operation': {
        method: 'get',
        url: 'http://localhost:3000/some/path',
      },
      checks: [],
      response: {
        body: { pets: ['dog', 'cat', 'bunny'], access_token: null, checks: [] },
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
          type: {
            type: 'jsonpath',
            version: 'draft-goessner-dispatch-jsonpath-00',
          },
          context: '$response.body',
          condition: '$.pets.length > 0',
        },
        {
          type: {
            type: 'jsonpath',
            version: 'draft-goessner-dispatch-jsonpath-00',
          },
          context: '$response.body',
          condition: '$.checks.length == 0',
        },
      ],
      ctx: {
        workflows: [],
        $workflows: {
          workflowId: {
            steps: {
              stepId: {
                response: {
                  body: { pets: ['dog', 'cat', 'bunny'], access_token: null },
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
        $response: {
          body: { pets: ['dog', 'cat', 'bunny'], access_token: null },
        },
        severity: DEFAULT_SEVERITY_CONFIGURATION,
        options: {
          logger,
        },
      } as unknown as TestContext,
    });
    expect(result).toEqual([
      {
        message: 'Checking jsonpath criteria: $.pets.length > 0',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$.pets.length > 0',
      },
      {
        message: 'Checking jsonpath criteria: $.checks.length == 0',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: true,
        severity: 'error',
        condition: '$.checks.length == 0',
      },
    ]);
  });

  it('should fail jsonpath success criteria when context is missing', () => {
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
          condition: '$.pets.length > 2',
        },
      ],
      ctx: {
        workflows: [],
        $workflows: {
          workflowId: {
            steps: {
              stepId: {
                response: {
                  body: { access_token: null },
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
        $response: {
          body: { access_token: null },
        },
        severity: DEFAULT_SEVERITY_CONFIGURATION,
        options: {
          logger,
        },
      } as unknown as TestContext,
    });
    expect(result).toEqual([
      {
        message: 'Checking jsonpath criteria: $.pets.length > 2',
        name: CHECKS.SUCCESS_CRITERIA_CHECK,
        passed: false,
        severity: 'error',
        condition: '$.pets.length > 2',
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
        harLogs: [],
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
        harLogs: [],
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
