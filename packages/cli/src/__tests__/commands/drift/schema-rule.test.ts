import { SchemaConsistencyRule } from '../../../commands/drift/rules/builtins/schema.js';
import type {
  MatchedOperation,
  NormalizedExchange,
  RuleContext,
} from '../../../commands/drift/types/index.js';
import { parseHeaderIgnoreList } from '../../../commands/drift/utils/http.js';

function createMatchedOperation(): MatchedOperation {
  return {
    operation: {
      operationId: 'listOrderItems',
      method: 'get',
      pathTemplate: '/order-items',
      pathRegex: /^\/order-items$/,
      pathParams: [],
      pathScore: 1,
      servers: [],
      requestParameters: [{ name: 'filter', in: 'query', required: true }],
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
  responseStatus: number,
  options: { requestHeaders?: Record<string, string>; ignoreHeaders?: string[] } = {}
): RuleContext {
  const requestUrl = 'https://api.example.com/order-items';
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
      protocolKnown: true,
      host: parsedUrl.host,
      headers: options.requestHeaders ?? {},
    },
    response: {
      status: responseStatus,
      headers: {},
    },
  };

  return {
    exchange,
    matchedOperation: createMatchedOperation(),
    matchMode: 'strict-host',
    hostCompatibleWithSpecServers: true,
    ignoreHeaders: options.ignoreHeaders ? parseHeaderIgnoreList(options.ignoreHeaders) : undefined,
    validateSchema: () => ({ valid: true, errors: [] }),
  };
}

describe('schema-consistency required parameter check', () => {
  const rule = new SchemaConsistencyRule();

  function missingFilterFindings(context: RuleContext) {
    return rule
      .analyze(context)
      .filter((finding) => finding.message === 'Missing required query parameter: "filter"');
  }

  it('flags a missing required query parameter when the server accepted the request', () => {
    expect(missingFilterFindings(createContext(200))).toHaveLength(1);
  });

  it('does not flag a missing required query parameter when the server rejected the request with 4xx', () => {
    expect(missingFilterFindings(createContext(400))).toHaveLength(0);
  });
});

describe('schema-consistency undocumented header check', () => {
  const rule = new SchemaConsistencyRule();

  function undocumentedHeaderFindings(context: RuleContext) {
    return rule
      .analyze(context)
      .filter((finding) => finding.message.startsWith('Undocumented header in traffic:'));
  }

  it('flags an undocumented header that is not in the ignore list', () => {
    const context = createContext(200, { requestHeaders: { 'x-caddy-auth-token': 'secret' } });
    expect(undocumentedHeaderFindings(context)).toHaveLength(1);
  });

  it('still flags undocumented headers when the server rejected the request with 4xx', () => {
    const context = createContext(400, { requestHeaders: { 'x-caddy-auth-token': 'secret' } });
    expect(undocumentedHeaderFindings(context)).toHaveLength(1);
  });

  it('skips headers matched by an exact name or a prefix pattern in --ignore-headers', () => {
    const context = createContext(200, {
      requestHeaders: {
        'x-caddy-auth-token': 'secret',
        'x-consumer-id': '42',
        'x-consumer-teams': 'core',
      },
      ignoreHeaders: ['x-caddy-auth-token', 'x-consumer-*'],
    });
    expect(undocumentedHeaderFindings(context)).toHaveLength(0);
  });
});
