import { SchemaConsistencyRule } from '../../../commands/drift/rules/builtins/schema.js';
import type {
  MatchedOperation,
  NormalizedExchange,
  RuleContext,
} from '../../../commands/drift/types/index.js';

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

function createContext(responseStatus: number): RuleContext {
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
      headers: {},
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
