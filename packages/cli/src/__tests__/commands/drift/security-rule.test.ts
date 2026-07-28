import { SecurityRule } from '../../../commands/drift/rules/builtins/security.js';
import type {
  MatchedOperation,
  NormalizedExchange,
  RuleContext,
} from '../../../commands/drift/types/index.js';

function createMatchedOperation(): MatchedOperation {
  return {
    operation: {
      operationId: 'listMenuItems',
      method: 'get',
      pathTemplate: '/menu',
      pathRegex: /^\/menu$/,
      pathParams: [],
      pathScore: 1,
      servers: [],
      requestParameters: [],
      requestBodyContent: {},
      requestBodyRequired: false,
      responseBodyContent: {},
      security: undefined,
      securitySchemes: {},
      specSource: 'openapi.yaml',
    },
    pathParams: {},
  };
}

function createContext(
  requestUrl: string,
  options?: {
    headers?: Record<string, string>;
    protocolKnown?: boolean;
  }
): RuleContext {
  const parsedUrl = new URL(requestUrl);
  const exchange: NormalizedExchange = {
    index: 0,
    source: 'test',
    request: {
      method: 'GET',
      url: requestUrl,
      path: parsedUrl.pathname,
      query: parsedUrl.searchParams,
      protocol: parsedUrl.protocol,
      protocolKnown: options?.protocolKnown ?? true,
      host: parsedUrl.host,
      headers: options?.headers ?? {},
    },
    response: {
      status: 200,
      headers: {},
    },
  };

  return {
    exchange,
    matchedOperation: createMatchedOperation(),
    matchMode: 'strict-host',
    hostCompatibleWithSpecServers: true,
    validateSchema: () => ({ valid: true, errors: [] }),
  };
}

describe('security-baseline insecure transport check', () => {
  const rule = new SecurityRule();
  const authHeaders = { authorization: 'Bearer test-token' };

  function transportFindings(context: RuleContext) {
    return rule
      .analyze(context)
      .filter(
        (finding) =>
          finding.message === 'Potential credential exposure over insecure HTTP transport'
      );
  }

  it('flags authenticated requests over plain HTTP to a public host', () => {
    const findings = transportFindings(
      createContext('http://api.example.com/menu', { headers: authHeaders })
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'security-baseline',
      severity: 'warning',
      details: { hasAuthorizationHeader: true },
    });
  });

  it('flags sensitive query parameters over plain HTTP to a public host', () => {
    const findings = transportFindings(createContext('http://api.example.com/menu?api_key=12345'));

    expect(findings).toHaveLength(1);
    expect(findings[0].details).toMatchObject({
      sensitiveQueryKeys: ['api_key'],
    });
  });

  it.each([
    'http://localhost:9000/menu',
    'http://sub.localhost:9000/menu',
    'http://127.0.0.1:4040/menu',
    'http://127.1.2.3/menu',
    'http://[::1]:8080/menu',
  ])('does not flag authenticated plain-HTTP requests to loopback host %s', (url) => {
    expect(transportFindings(createContext(url, { headers: authHeaders }))).toHaveLength(0);
  });

  it('does not flag sensitive query parameters sent to a loopback host', () => {
    expect(transportFindings(createContext('http://localhost:9000/menu?token=abc'))).toHaveLength(
      0
    );
  });

  it('does not flag unauthenticated plain-HTTP requests', () => {
    expect(transportFindings(createContext('http://api.example.com/menu'))).toHaveLength(0);
  });

  it('does not flag authenticated HTTPS requests', () => {
    expect(
      transportFindings(createContext('https://api.example.com/menu', { headers: authHeaders }))
    ).toHaveLength(0);
  });

  it('does not flag when the capture did not record the scheme', () => {
    expect(
      transportFindings(
        createContext('http://api.example.com/menu', {
          headers: authHeaders,
          protocolKnown: false,
        })
      )
    ).toHaveLength(0);
  });
});
