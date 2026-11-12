import { logger } from '@redocly/openapi-core';

import type { Step, RuntimeExpressionContext, TestContext } from '../../../types.js';
import { resolveXSecurityParameters } from '../../flow-runner/resolve-x-security-parameters.js';

describe('resolveXSecurityParameters', () => {
  const ctx = {
    secretsSet: new Set(),
    options: {
      logger,
    },
  } as TestContext;

  it('should resolve x-security parameters', () => {
    const runtimeContext = {
      $steps: {
        basicAuth: {
          outputs: {
            token: '12345',
          },
        },
      },
    } as unknown as RuntimeExpressionContext;

    const step = {
      stepId: 'getPet',
      'x-security': [
        {
          scheme: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          values: {
            token: '$steps.basicAuth.outputs.token',
          },
        },
      ],
    } as unknown as Step;

    const { parameters } = resolveXSecurityParameters({
      ctx,
      runtimeContext,
      step,
    });
    expect(parameters).toEqual([
      {
        name: 'Authorization',
        in: 'header',
        value: 'Bearer 12345',
      },
    ]);
    expect(step['x-security']?.[0]?.values).toEqual({
      token: '12345',
    });
  });

  it('should merge x-security schemes on workflow level to steps', () => {
    const runtimeContext = {
      $steps: {
        basicAuth: {
          outputs: {
            token: '12345',
          },
        },
      },
      $inputs: {
        secret: 'some-password',
      },
    } as unknown as RuntimeExpressionContext;

    const step = {
      stepId: 'getPet',
      'x-security': [
        {
          scheme: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          values: {
            token: '$steps.basicAuth.outputs.token',
          },
        },
        {
          scheme: { type: 'apiKey', name: 'x-api-key', in: 'header' },
          values: { apiKey: 'step-level-api-key' },
        },
      ],
    } as unknown as Step;

    const workflowLevelXSecurityParameters = [
      {
        scheme: { type: 'http', scheme: 'bearer' },
        values: { token: 'workflow-level-token' },
      },
      {
        scheme: { type: 'apiKey', name: 'x-api-key', in: 'header' },
        values: { apiKey: 'workflow-level-api-key' },
      },
      {
        scheme: { type: 'apiKey', name: 'x-api-key', in: 'cookie' },
        values: { apiKey: 'workflow-level-api-key' },
      },
      {
        scheme: {
          type: 'apiKey',
          name: 'different-workflow-level-x-api-key',
          in: 'header',
        },
        values: { apiKey: '$inputs.secret' },
      },
      {
        scheme: { type: 'oauth2', flows: [Object] },
        values: { accessToken: 'some-token-4' },
      },
    ] as any[];

    const operation = {
      servers: [{ url: 'https://redocly.com/_mock/demo/openapi/museum-api/' }],
      summary: 'Create special events',
      description: 'Creates a new special event for the museum.',
      operationId: 'createSpecialEvent',
      tags: ['Events'],
      requestBody: { required: true, content: { 'application/json': [Object] } },
      responses: {
        '201': { description: 'Created.', content: [Object] },
        '400': { description: 'Bad request.', content: [Object] },
        '404': { description: 'Not found.', content: [Object] },
      },
      pathParameters: [],
      path: '/special-events',
      method: 'post',
      descriptionName: 'museum-api',
      securitySchemes: { MuseumPlaceholderAuth: { type: 'http', scheme: 'basic' } },
    } as any;

    const { parameters } = resolveXSecurityParameters({
      ctx,
      runtimeContext,
      step,
      operation,
      workflowLevelXSecurityParameters,
    });

    expect(parameters).toEqual([
      {
        in: 'header',
        name: 'Authorization',
        value: 'Bearer workflow-level-token',
      },
      {
        in: 'header',
        name: 'x-api-key',
        value: 'workflow-level-api-key',
      },
      {
        in: 'cookie',
        name: 'x-api-key',
        value: 'workflow-level-api-key',
      },
      {
        in: 'header',
        name: 'different-workflow-level-x-api-key',
        value: 'some-password',
      },
      {
        in: 'header',
        name: 'Authorization',
        value: 'Bearer some-token-4',
      },
      {
        in: 'header',
        name: 'Authorization',
        value: 'Bearer 12345',
      },
      {
        in: 'header',
        name: 'x-api-key',
        value: 'step-level-api-key',
      },
    ]);
  });

  describe('digestCredentials', () => {
    const digest = (username: string, password: string) => ({
      scheme: { type: 'http', scheme: 'digest' },
      values: { username, password },
    });
    const bearer = (token: string) => ({
      scheme: { type: 'http', scheme: 'bearer' },
      values: { token },
    });
    const runtimeContext = {
      $inputs: { password: 'from-input' },
    } as unknown as RuntimeExpressionContext;

    it('should return digest credentials when digest is the only scheme', () => {
      const step = { stepId: 's', 'x-security': [digest('user', 'pass')] } as unknown as Step;
      const result = resolveXSecurityParameters({ ctx, runtimeContext, step });
      expect(result.parameters).toEqual([]);
      expect(result.digestCredentials).toEqual({ username: 'user', password: 'pass' });
    });

    it('should return digest credentials when digest comes after bearer', () => {
      const step = {
        stepId: 's',
        'x-security': [bearer('token'), digest('user', 'pass')],
      } as unknown as Step;
      const result = resolveXSecurityParameters({ ctx, runtimeContext, step });
      expect(result.digestCredentials).toEqual({ username: 'user', password: 'pass' });
    });

    it('should not return digest credentials when a later scheme sets Authorization', () => {
      const step = {
        stepId: 's',
        'x-security': [digest('user', 'pass'), bearer('token')],
      } as unknown as Step;
      const result = resolveXSecurityParameters({ ctx, runtimeContext, step });
      expect(result.digestCredentials).toBeUndefined();
    });

    it('should not return digest credentials when none is configured', () => {
      const step = { stepId: 's', 'x-security': [bearer('token')] } as unknown as Step;
      expect(resolveXSecurityParameters({ ctx, runtimeContext, step }).digestCredentials).toBe(
        undefined
      );
    });

    it('should not leak the first call credentials into a reused workflow', () => {
      const workflowLevelXSecurityParameters = [
        {
          scheme: { type: 'http', scheme: 'digest' },
          values: { username: 'user', password: '$inputs.password' },
        },
      ] as any;
      const step = { stepId: 's' } as unknown as Step;
      const first = resolveXSecurityParameters({
        ctx,
        runtimeContext,
        step,
        workflowLevelXSecurityParameters,
      });
      const second = resolveXSecurityParameters({
        ctx,
        runtimeContext: { $inputs: { password: 'second' } } as unknown as RuntimeExpressionContext,
        step,
        workflowLevelXSecurityParameters: [
          {
            scheme: { type: 'http', scheme: 'digest' },
            values: { username: 'user2', password: 'p2' },
          },
        ] as any,
      });
      expect(first.digestCredentials).toEqual({ username: 'user', password: 'from-input' });
      expect(second.digestCredentials).toEqual({ username: 'user2', password: 'p2' });
    });
  });

  it('should throw when schemeName is provided but scheme cannot be resolved', () => {
    const runtimeContext = {} as RuntimeExpressionContext;
    const step = {
      stepId: 'getPet',
      'x-security': [
        { schemeName: '$sourceDescriptions.museum-api.Missing', values: { token: 'x' } },
      ],
    } as unknown as Step;

    const ctxWithSources = {
      ...ctx,
      $sourceDescriptions: { 'museum-api': { components: { securitySchemes: {} } } },
    };

    expect(() => resolveXSecurityParameters({ ctx: ctxWithSources, runtimeContext, step })).toThrow(
      'Security scheme "$sourceDescriptions.museum-api.Missing" not found'
    );
  });
});
