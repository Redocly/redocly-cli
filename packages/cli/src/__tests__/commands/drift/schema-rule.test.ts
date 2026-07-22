import { SchemaConsistencyRule } from '../../../commands/drift/rules/builtins/schema.js';
import type {
  MatchedOperation,
  NormalizedExchange,
  OpenApiParameter,
  RuleContext,
} from '../../../commands/drift/types/index.js';
import { parseHeaderIgnoreList } from '../../../commands/drift/utils/http.js';

function createMatchedOperation(requestParameters?: OpenApiParameter[]): MatchedOperation {
  return {
    operation: {
      operationId: 'listOrderItems',
      method: 'get',
      pathTemplate: '/order-items',
      pathRegex: /^\/order-items$/,
      pathParams: [],
      pathScore: 1,
      servers: [],
      requestParameters: requestParameters ?? [{ name: 'filter', in: 'query', required: true }],
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
  options: {
    requestHeaders?: Record<string, string>;
    ignoreHeaders?: string[];
    queryString?: string;
    requestParameters?: OpenApiParameter[];
  } = {}
): RuleContext {
  const requestUrl = `https://api.example.com/order-items${
    options.queryString ? `?${options.queryString}` : ''
  }`;
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
    matchedOperation: createMatchedOperation(options.requestParameters),
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

describe('schema-consistency deepObject query parameter check', () => {
  const rule = new SchemaConsistencyRule();

  it('maps bracketed query keys to a documented deepObject parameter and validates the object', () => {
    const validatedValues: unknown[] = [];
    const context = createContext(200, {
      queryString: 'namespace[id]=acme&namespace[name]=acme&other[id]=1',
      requestParameters: [
        {
          name: 'namespace',
          in: 'query',
          required: true,
          style: 'deepObject',
          schema: { type: 'object' },
        },
      ],
    });
    context.validateSchema = (_schema, value) => {
      validatedValues.push(value);
      return { valid: true, errors: [] };
    };

    const findings = rule.analyze(context);

    expect(
      findings
        .filter((finding) => finding.message.startsWith('Undocumented query parameter'))
        .map((finding) => finding.message)
    ).toEqual(['Undocumented query parameter in traffic: "other[id]"']);
    expect(
      findings.filter((finding) => finding.message.startsWith('Missing required query parameter'))
    ).toHaveLength(0);
    expect(validatedValues).toEqual([{ id: 'acme', name: 'acme' }]);
  });
});
