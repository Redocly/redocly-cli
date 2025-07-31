import { readFileSync } from 'node:fs';

export interface ProtoService {
  name: string;
  methods: ProtoMethod[];
}

export interface ProtoMethod {
  name: string;
  inputType: string;
  outputType: string;
  httpOptions?: {
    method: string;
    path: string;
  };
}

export interface ProtoMessage {
  name: string;
  fields: ProtoField[];
}

export interface ProtoField {
  name: string;
  type: string;
  number: number;
  repeated?: boolean;
}

export interface ProtoEnum {
  name: string;
  values: ProtoEnumValue[];
}

export interface ProtoEnumValue {
  name: string;
  number: number;
}

export interface ParsedProto {
  package?: string;
  services: ProtoService[];
  messages: ProtoMessage[];
  enums: ProtoEnum[];
}

export function parseProtoFile(filePath: string): ParsedProto {
  const content = readFileSync(filePath, 'utf-8');
  return parseProtoContent(content);
}

export function parseProtoContent(content: string): ParsedProto {
  const lines = content.split('\n').map((line) => line.trim());

  const result: ParsedProto = {
    services: [],
    messages: [],
    enums: [],
  };

  let currentService: ProtoService | null = null;
  let currentMessage: ProtoMessage | null = null;
  let currentEnum: ProtoEnum | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and empty lines
    if (line.startsWith('//') || line === '') continue;

    // Parse package declaration
    const packageMatch = line.match(/^package\s+(\w+(?:\.\w+)*);/);
    if (packageMatch) {
      result.package = packageMatch[1];
      continue;
    }

    // Parse service definition
    const serviceMatch = line.match(/^service\s+(\w+)\s*\{/);
    if (serviceMatch) {
      currentService = { name: serviceMatch[1], methods: [] };
      result.services.push(currentService);
      continue;
    }

    // Parse method definition
    if (currentService && line.includes('(') && line.includes(')')) {
      const method = parseMethod(line, lines, i);
      if (method) {
        currentService.methods.push(method);
      }
      continue;
    }

    // Parse message definition
    const messageMatch = line.match(/^message\s+(\w+)\s*\{/);
    if (messageMatch) {
      currentMessage = { name: messageMatch[1], fields: [] };
      result.messages.push(currentMessage);
      continue;
    }

    // Parse field definition
    if (currentMessage && line.includes('=') && line.includes(';')) {
      const field = parseField(line);
      if (field) {
        currentMessage.fields.push(field);
      }
      continue;
    }

    // Parse enum definition
    const enumMatch = line.match(/^enum\s+(\w+)\s*\{/);
    if (enumMatch) {
      currentEnum = { name: enumMatch[1], values: [] };
      result.enums.push(currentEnum);
      continue;
    }

    // Parse enum value
    if (currentEnum && line.includes('=') && line.includes(';')) {
      const enumValue = parseEnumValue(line);
      if (enumValue) {
        currentEnum.values.push(enumValue);
      }
      continue;
    }

    // Handle closing braces
    if (line === '}') {
      if (currentService) currentService = null;
      if (currentMessage) currentMessage = null;
      if (currentEnum) currentEnum = null;
    }
  }

  return result;
}

function parseMethod(line: string, lines: string[], currentIndex: number): ProtoMethod | null {
  const methodMatch = line.match(/^\s*rpc\s+(\w+)\s*\(\s*(\w+)\s*\)\s*returns\s*\(\s*(\w+)\s*\)/);
  if (!methodMatch) return null;

  const method: ProtoMethod = {
    name: methodMatch[1],
    inputType: methodMatch[2],
    outputType: methodMatch[3],
  };

  // Look for HTTP options in the next few lines
  for (let i = currentIndex + 1; i < Math.min(currentIndex + 10, lines.length); i++) {
    const nextLine = lines[i];
    if (nextLine.includes('option') && nextLine.includes('google.api.http')) {
      const httpOptions = parseHttpOptions(nextLine);
      if (httpOptions) {
        method.httpOptions = httpOptions;
      }
      break;
    }
    if (nextLine.includes('}')) break;
  }

  return method;
}

function parseHttpOptions(line: string): { method: string; path: string } | null {
  const getMatch = line.match(/get\s*=\s*"([^"]+)"/);
  const postMatch = line.match(/post\s*=\s*"([^"]+)"/);
  const putMatch = line.match(/put\s*=\s*"([^"]+)"/);
  const deleteMatch = line.match(/delete\s*=\s*"([^"]+)"/);

  if (getMatch) return { method: 'GET', path: getMatch[1] };
  if (postMatch) return { method: 'POST', path: postMatch[1] };
  if (putMatch) return { method: 'PUT', path: putMatch[1] };
  if (deleteMatch) return { method: 'DELETE', path: deleteMatch[1] };

  return null;
}

function parseField(line: string): ProtoField | null {
  const fieldMatch = line.match(/^\s*(?:repeated\s+)?(\w+)\s+(\w+)\s*=\s*(\d+);/);
  if (!fieldMatch) return null;

  const field: ProtoField = {
    type: fieldMatch[1],
    name: fieldMatch[2],
    number: parseInt(fieldMatch[3]),
  };

  if (line.includes('repeated')) {
    field.repeated = true;
  }

  return field;
}

function parseEnumValue(line: string): ProtoEnumValue | null {
  const enumValueMatch = line.match(/^\s*(\w+)\s*=\s*(\d+);/);
  if (!enumValueMatch) return null;

  return {
    name: enumValueMatch[1],
    number: parseInt(enumValueMatch[2]),
  };
}

export function protoToOpenAPI(proto: ParsedProto): any {
  const openapi: any = {
    openapi: '3.0.0',
    info: {
      title: `${proto.package || 'Protocol Buffers'} API`,
      version: '1.0.0',
      description: `API generated from Protocol Buffers definition`,
    },
    paths: {},
    components: {
      schemas: {},
    },
  };

  // Convert messages to schemas
  proto.messages.forEach((message) => {
    const schema: any = {
      type: 'object',
      properties: {},
      required: [],
    };

    message.fields.forEach((field) => {
      const property: any = {
        type: mapProtoTypeToOpenAPIType(field.type),
        description: `${field.name} field`,
      };

      if (field.repeated) {
        (property as any).items = { type: mapProtoTypeToOpenAPIType(field.type) };
        (property as any).type = 'array';
      }

      schema.properties[field.name] = property;
    });

    openapi.components.schemas[message.name] = schema;
  });

  // Convert enums to schemas
  proto.enums.forEach((enumDef) => {
    const schema = {
      type: 'string',
      enum: enumDef.values.map((v) => v.name),
      description: `${enumDef.name} enum`,
    };

    openapi.components.schemas[enumDef.name] = schema;
  });

  // Convert services to paths
  proto.services.forEach((service) => {
    service.methods.forEach((method) => {
      if (method.httpOptions) {
        const path = method.httpOptions.path;
        const httpMethod = method.httpOptions.method.toLowerCase();

        if (!openapi.paths[path]) {
          openapi.paths[path] = {};
        }

        openapi.paths[path][httpMethod] = {
          summary: `${method.name} operation`,
          description: `gRPC method: ${method.name}`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${method.inputType}`,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: `#/components/schemas/${method.outputType}`,
                  },
                },
              },
            },
          },
        };
      }
    });
  });

  return openapi;
}

function mapProtoTypeToOpenAPIType(protoType: string): string {
  const typeMap: { [key: string]: string } = {
    string: 'string',
    int32: 'integer',
    int64: 'integer',
    uint32: 'integer',
    uint64: 'integer',
    sint32: 'integer',
    sint64: 'integer',
    fixed32: 'integer',
    fixed64: 'integer',
    sfixed32: 'integer',
    sfixed64: 'integer',
    bool: 'boolean',
    float: 'number',
    double: 'number',
    bytes: 'string',
  };

  return typeMap[protoType] || 'object';
}
