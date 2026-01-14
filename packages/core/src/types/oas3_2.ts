import { listOf, mapOf, type NodeType } from './index.js';
import { Oas3Types } from './oas3.js';
import { Oas3_1Types } from './oas3_1.js';

const Root: NodeType = {
  ...Oas3_1Types.Root,
  properties: {
    ...Oas3_1Types.Root.properties,
    $self: {
      type: 'string',
      description:
        'This string MUST be in the form of a URI reference as defined by [RFC3986] Section 4.1. The $self field provides the self-assigned URI of this document, which also serves as its base URI in accordance with [RFC3986] Section 5.1.1. Implementations MUST support identifying the targets of API description URIs using the URI defined by this field when it is present. See Establishing the Base URI for the base URI behavior when $self is absent or relative, and see Appendix F for examples of using $self to resolve references.',
    },
  },
  documentationLink: 'https://spec.openapis.org/oas/v3.2.0.html#security-scheme-object',
};

const Tag: NodeType = {
  ...Oas3_1Types.Tag,
  properties: {
    ...Oas3_1Types.Tag.properties,
    kind: {
      type: 'string',
      description:
        'A machine-readable string to categorize what sort of tag it is. Any string value can be used; common uses are nav for Navigation, badge for visible badges, audience for APIs used by different groups. A registry of the most commonly used values is available.',
    },
    parent: {
      type: 'string',
      description:
        'The name of a tag that this tag is nested under. The named tag MUST exist in the API description, and circular references between parent and child tags MUST NOT be used.',
    },
    summary: {
      type: 'string',
      description: 'A short summary of the tag, used for display purposes.',
    },
  },
  documentationLink: 'https://spec.openapis.org/oas/v3.2.0.html#tag-object',
  description:
    'Adds metadata to a single tag that is used by the Operation Object. It is not mandatory to have a Tag Object per tag defined in the Operation Object instances.',
};

const Server: NodeType = {
  ...Oas3_1Types.Server,
  properties: {
    ...Oas3_1Types.Server.properties,
    name: {
      type: 'string',
      description: 'An optional unique string to refer to the host designated by the URL.',
    },
  },
  documentationLink: 'https://spec.openapis.org/oas/v3.2.0.html#server-object',
  description: 'An object representing a Server.',
};

const SecurityScheme: NodeType = {
  ...Oas3_1Types.SecurityScheme,
  properties: {
    ...Oas3_1Types.SecurityScheme.properties,
    deprecated: {
      type: 'boolean',
      description:
        'Declares this security scheme to be deprecated. Consumers SHOULD refrain from usage of the declared scheme. Default value is false.',
    }, // added in OAS 3.2
    oauth2MetadataUrl: {
      type: 'string',
      description: 'URL to the OAuth2 authorization server metadata [RFC8414]. TLS is required.',
    }, // added in OAS 3.2
  },
  allowed(value) {
    switch (value?.type) {
      case 'apiKey':
        return [
          'type',
          'name',
          'in',
          'description',
          'deprecated', // added in OAS 3.2
        ];
      case 'http':
        return [
          'type',
          'scheme',
          'bearerFormat',
          'description',
          'deprecated', // added in OAS 3.2
        ];
      case 'oauth2':
        switch (value?.flows) {
          case 'implicit':
            return [
              'type',
              'flows',
              'authorizationUrl',
              'refreshUrl',
              'description',
              'scopes',
              'oauth2MetadataUrl', // added in OAS 3.2
              'deprecated', // added in OAS 3.2
            ];
          case 'password':
          case 'clientCredentials':
            return [
              'type',
              'flows',
              'tokenUrl',
              'refreshUrl',
              'description',
              'scopes',
              'oauth2MetadataUrl', // added in OAS 3.2
              'deprecated', // added in OAS 3.2
            ];
          case 'authorizationCode':
            return [
              'type',
              'flows',
              'authorizationUrl',
              'refreshUrl',
              'tokenUrl',
              'description',
              'scopes',
              'oauth2MetadataUrl', // added in OAS 3.2
              'deprecated', // added in OAS 3.2
            ];
          case 'deviceAuthorization': // added in OAS 3.2
            return ['type', 'flows', 'deviceAuthorizationUrl', 'tokenUrl'];
          default:
            return [
              'type',
              'flows',
              'authorizationUrl',
              'refreshUrl',
              'tokenUrl',
              'description',
              'scopes',
              'oauth2MetadataUrl', // added in OAS 3.2
              'deprecated', // added in OAS 3.2
            ];
        }
      case 'openIdConnect':
        return [
          'type',
          'openIdConnectUrl',
          'description',
          'deprecated', // added in OAS 3.2
        ];
      case 'mutualTLS':
        return [
          'type',
          'description',
          'deprecated', // added in OAS 3.2
        ];
      default:
        return [
          'type',
          'description',
          'deprecated', // added in OAS 3.2
        ];
    }
  },
  documentationLink: 'https://spec.openapis.org/oas/v3.2.0.html#security-scheme-object',
  description: 'Defines a security scheme that can be used by the operations.',
};

const OAuth2Flows: NodeType = {
  ...Oas3_1Types.OAuth2Flows,
  properties: {
    ...Oas3_1Types.OAuth2Flows.properties,
    deviceAuthorization: 'DeviceAuthorization',
  },
};

const DeviceAuthorization: NodeType = {
  properties: {
    deviceAuthorizationUrl: {
      type: 'string',
      description:
        'REQUIRED. The device authorization URL to be used for this flow. This MUST be in the form of a URL. The OAuth2 standard requires the use of TLS.',
    },
    tokenUrl: {
      type: 'string',
      description:
        'REQUIRED. The token URL to be used for this flow. This MUST be in the form of a URL. The OAuth2 standard requires the use of TLS.',
    },
    refreshUrl: {
      type: 'string',
      description:
        'The URL to be used for obtaining refresh tokens. This MUST be in the form of a URL. The OAuth2 standard requires the use of TLS.',
    },
    scopes: mapOf('string', {
      description:
        'REQUIRED. The available scopes for the OAuth2 security scheme. A map between the scope name and a short description for it. The map MAY be empty.',
    }),
  },
  required: ['deviceAuthorizationUrl', 'tokenUrl', 'scopes'],
  extensionsPrefix: 'x-',
  description: 'Configuration for the OAuth Device Authorization flow.',
};

const PathItem: NodeType = {
  ...Oas3Types.PathItem,
  properties: {
    ...Oas3Types.PathItem.properties,
    query: 'Operation',
    additionalOperations: mapOf('Operation'),
  },
};

const Parameter: NodeType = {
  ...Oas3_1Types.Parameter,
  properties: {
    ...Oas3_1Types.Parameter.properties,
    in: {
      description:
        'REQUIRED. The location of the parameter. Possible values are "query", "querystring", "header", "path" or "cookie".',
      enum: ['query', 'header', 'path', 'cookie', 'querystring'],
    },
  },
};

const Response: Omit<NodeType, 'required'> = {
  ...Oas3_1Types.Response,
  properties: {
    ...Oas3_1Types.Response.properties,
    summary: {
      type: 'string',
      description: 'A short summary of the meaning of the response.',
    },
  },
};

const MediaType: NodeType = {
  ...Oas3_1Types.MediaType,
  properties: {
    ...Oas3_1Types.MediaType.properties,
    itemSchema: 'Schema',
    prefixEncoding: listOf('Encoding', {
      description:
        'A map between a property name and its encoding information, as defined under Encoding By Name. The encoding field SHALL only apply when the media type is multipart or application/x-www-form-urlencoded. If no Encoding Object is provided for a property, the behavior is determined by the default values documented for the Encoding Object. This field MUST NOT be present if prefixEncoding or itemEncoding are present.',
    }),
    itemEncoding: 'Encoding',
  },
};

const Discriminator: NodeType = {
  ...Oas3_1Types.Discriminator,
  properties: {
    ...Oas3_1Types.Discriminator.properties,
    defaultMapping: {
      type: 'string',
      description:
        'The schema name or URI reference to a schema that is expected to validate the structure of the model when the discriminating property is not present in the payload or contains a value for which there is no explicit or implicit mapping.',
    },
  },
};

const Example: NodeType = {
  ...Oas3_1Types.Example,
  properties: {
    ...Oas3_1Types.Example.properties,
    dataValue: {
      resolvable: false,
      description:
        'An example of the data structure that MUST be valid according to the relevant Schema Object. If this field is present, value MUST be absent.',
    },
    serializedValue: {
      type: 'string',
      description:
        'An example of the serialized form of the value, including encoding and escaping as described under Validating Examples. If dataValue is present, then this field SHOULD contain the serialization of the given data. Otherwise, it SHOULD be the valid serialization of a data value that itself MUST be valid as described for dataValue. This field SHOULD NOT be used if the serialization format is JSON, as the data form is easier to work with. If this field is present, value, and externalValue MUST be absent.',
    },
  },
};

const Xml: NodeType = {
  properties: {
    nodeType: {
      type: 'string',
      enum: ['element', 'attribute', 'text', 'cdata', 'none'],
      description:
        'One of element, attribute, text, cdata, or none, as explained under XML Node Types. The default value is none if $ref, $dynamicRef, or type: "array" is present in the Schema Object containing the XML Object, and element otherwise.',
    },
    name: {
      type: 'string',
      description:
        'Sets the name of the element/attribute corresponding to the schema, replacing the name that was inferred as described under XML Node Names. This field SHALL be ignored if the nodeType is text, cdata, or none.',
    },
    namespace: {
      type: 'string',
      description:
        'The IRI ([RFC3987]) of the namespace definition. Value MUST be in the form of a non-relative IRI.',
    },
    prefix: {
      type: 'string',
      description: 'The prefix to be used for the name.',
    },
    attribute: {
      type: 'boolean',
      description:
        'Declares whether the property definition translates to an attribute instead of an element. Default value is false. If nodeType is present, this field MUST NOT be present.Deprecated: Use nodeType: "attribute" instead of attribute: true.',
    },
    wrapped: {
      type: 'boolean',
      description:
        'MAY be used only for an array definition. Signifies whether the array is wrapped (for example, <books><book/><book/></books>) or unwrapped (<book/><book/>). Default value is false. The definition takes effect only when defined alongside type being "array" (outside the items). If nodeType is present, this field MUST NOT be present. Deprecated: Use nodeType: "element" instead of wrapped: true.',
    }, // Deprecated in OAS 3.2: Use nodeType: "element" instead
  },
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.openapis.org/oas/v3.2.0.html#xml-object',
  description:
    'A metadata object that allows for more fine-tuned XML model definitions. When using a Schema Object with XML, if no XML Object is present, the behavior is determined by the XML Object’s default field values.',
};

// based on draft-2020-12
const Schema: NodeType = {
  ...Oas3_1Types.Schema,
  properties: {
    ...Oas3_1Types.Schema.properties,
    xml: 'Xml',
  },
};

export const Oas3_2Types = {
  ...Oas3_1Types,
  Root,
  Tag,
  Server,
  SecurityScheme,
  OAuth2Flows,
  DeviceAuthorization,
  PathItem,
  Parameter,
  Response,
  MediaType,
  Discriminator,
  Example,
  Xml,
  Schema,
} as const;
