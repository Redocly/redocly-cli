import { listOf, mapOf, type NodeType } from './index.js';
import {
  Schema,
  SchemaProperties,
  Dependencies,
  DiscriminatorMapping,
  Discriminator,
} from './json-schema-draft7.shared.js';

const Root: NodeType = {
  properties: {
    openrpc: {
      type: 'string',
      description:
        'REQUIRED. This string MUST be the semantic version number of the OpenRPC Specification version that the OpenRPC document uses. The openrpc field SHOULD be used by tooling specifications and clients to interpret the OpenRPC document. This is not related to the API info.version string.',
    },
    info: 'Info',
    servers: 'ServerList',
    methods: 'MethodList',
    components: 'Components',
    externalDocs: 'ExternalDocs',
  },
  required: ['openrpc', 'info', 'methods'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#openrpc-object',
  description:
    'This is the root object of the OpenRPC document. The contents of this object represent a whole OpenRPC document. How this object is constructed or stored is outside the scope of the OpenRPC Specification.',
};

const Info: NodeType = {
  properties: {
    title: {
      type: 'string',
      description: 'REQUIRED. The title of the application.',
    },
    description: {
      type: 'string',
      description:
        'A verbose description of the application. GitHub Flavored Markdown syntax MAY be used for rich text representation.',
    },
    termsOfService: {
      type: 'string',
      description: 'A URL to the Terms of Service for the API. MUST be in the format of a URL.',
    },
    contact: 'Contact',
    license: 'License',
    version: {
      type: 'string',
      description:
        'REQUIRED. The version of the OpenRPC document (which is distinct from the OpenRPC Specification version or the API implementation version).',
    },
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
  description:
    'REQUIRED. Provides metadata about the API. The metadata MAY be used by tooling as required.',
  documentationLink: 'https://spec.open-rpc.org/#info-object',
};

const Contact: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: 'The identifying name of the contact person/organization.',
    },
    url: {
      type: 'string',
      description: 'The URL pointing to the contact information. MUST be in the format of a URL.',
    },
    email: {
      type: 'string',
      description:
        'The email address of the contact person/organization. MUST be in the format of an email address.',
    },
  },
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#contact-object',
  description: 'Contact information for the exposed API.',
};

const License: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: 'REQUIRED. The license name used for the API.',
    },
    url: {
      type: 'string',
      description: 'A URL to the license used for the API. MUST be in the format of a URL.',
    },
  },
  required: ['name'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#license-object',
  description: 'License information for the exposed API.',
};

const Server: NodeType = {
  properties: {
    url: {
      type: 'string',
      description:
        'REQUIRED. A URL to the target host. This URL supports Server Variables and MAY be relative, to indicate that the host location is relative to the location where the OpenRPC document is being served. Server Variables are passed into the Runtime Expression to produce a server URL.',
    },
    name: {
      type: 'string',
      description: 'REQUIRED. A name to be used as the canonical name for the server.',
    },
    description: {
      type: 'string',
      description:
        'An optional string describing the host designated by the URL. GitHub Flavored Markdown syntax MAY be used for rich text representation.',
    },
    summary: {
      type: 'string',
      description: 'A short summary of what the server is.',
    },
    variables: 'ServerVariablesMap',
  },
  required: ['url'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#server-object',
  description: 'An object representing a Server.',
};

const ServerVariable: NodeType = {
  properties: {
    enum: {
      type: 'array',
      items: { type: 'string' },
      description:
        'An enumeration of string values to be used if the substitution options are from a limited set.',
    },
    default: {
      type: 'string',
      description: `REQUIRED. The default value to use for substitution, which SHALL be sent if an alternate value is not supplied. Note this behavior is different than the Schema Object’s treatment of default values, because in those cases parameter values are optional.`,
    },
    description: {
      type: 'string',
      description:
        'An optional description for the server variable. GitHub Flavored Markdown syntax MAY be used for rich text representation.',
    },
  },
  required: ['default'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#server-variable-object',
  description: 'An object representing a Server Variable for server URL template substitution.',
};

const Method: NodeType = {
  properties: {
    name: {
      type: 'string',
      description:
        'REQUIRED. The cannonical name for the method. The name MUST be unique within the methods array.',
    },
    tags: 'TagList',
    summary: {
      type: 'string',
      description: 'A short summary of what the method does.',
    },
    description: {
      type: 'string',
      description:
        'A verbose explanation of the method behavior. GitHub Flavored Markdown syntax MAY be used for rich text representation.',
    },
    externalDocs: 'ExternalDocs',
    params: 'ContentDescriptorList',
    result: 'ContentDescriptor',
    deprecated: {
      type: 'boolean',
      description:
        'Declares this method to be deprecated. Consumers SHOULD refrain from usage of the declared method. Default value is false.',
    },
    servers: 'ServerList',
    errors: 'ErrorList',
    links: 'LinkList',
    paramStructure: { enum: ['by-name', 'by-position', 'either'] },
    examples: 'ExamplePairingList',
  },
  required: ['name', 'params'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#method-object',
  description:
    'Describes the interface for the given method name. The method name is used as the method field of the JSON-RPC body. It therefore MUST be unique.',
};

const ContentDescriptor: NodeType = {
  properties: {
    name: {
      type: 'string',
      description:
        'REQUIRED. Name of the content that is being described. If the content described is a method parameter assignable by-name, this field SHALL define the parameter’s key (ie name).',
    },
    summary: {
      type: 'string',
      description: 'A short summary of the content that is being described.',
    },
    description: {
      type: 'string',
      description: `A verbose explanation of the content descriptor behavior. GitHub Flavored Markdown syntax MAY be used for rich text representation.`,
    },
    required: {
      type: 'boolean',
      description: 'Determines if the content is a required field. Default value is false.',
    },
    schema: 'Schema',
    deprecated: {
      type: 'boolean',
      description:
        'Specifies that the content is deprecated and SHOULD be transitioned out of usage. Default value is false.',
    },
  },
  required: ['name', 'schema'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#content-descriptor-object',
  description:
    'Content Descriptors are objects that do just as they suggest - describe content. They are reusable ways of describing either parameters or result. They MUST have a schema.',
};

const ExamplePairing: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: 'REQUIRED Name for the example pairing.',
    },
    description: {
      type: 'string',
      description: 'A verbose explanation of the example pairing.',
    },
    summary: {
      type: 'string',
      description: 'Short description for the example pairing.',
    },
    params: 'ExampleList',
    result: 'Example',
  },
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#example-pairing-object',
  description:
    'The Example Pairing object consists of a set of example params and result. The result is what you can expect from the JSON-RPC service given the exact params.',
};

const Example: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: 'Cannonical name of the example.',
    },
    summary: {
      type: 'string',
      description: 'Short description for the example.',
    },
    description: {
      type: 'string',
      description:
        'A verbose explanation of the example. GitHub Flavored Markdown syntax MAY be used for rich text representation.',
    },
    value: {
      resolvable: false,
      description:
        'Embedded literal example. The value field and externalValue field are mutually exclusive. To represent examples of media types that cannot naturally represented in JSON, use a string value to contain the example, escaping where necessary.',
    },
    externalValue: {
      type: 'string',
      description:
        'A URL that points to the literal example. This provides the capability to reference examples that cannot easily be included in JSON documents. The value field and externalValue field are mutually exclusive.',
    },
  },
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#example-object',
  description:
    'The Example object is an object that defines an example that is intended to match the schema of a given Content Descriptor.',
};

const Link: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: 'REQUIRED. Canonical name of the link.',
    },
    description: {
      type: 'string',
      description:
        'A description of the link. GitHub Flavored Markdown syntax MAY be used for rich text representation.',
    },
    summary: {
      type: 'string',
      description: 'Short description for the link.',
    },
    method: {
      type: 'string',
      description:
        'The name of an existing, resolvable OpenRPC method, as defined with a unique method. This field MUST resolve to a unique Method Object. As opposed to Open Api, Relative method values ARE NOT permitted.',
    },
    params: {
      type: 'object',
      description:
        'A map representing parameters to pass to a method as specified with method. The key is the parameter name to be used, whereas the value can be a constant or a runtime expression to be evaluated and passed to the linked method.',
    }, // Map[string, Any | Runtime Expression]
    server: 'Server',
  },
  required: ['name'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#link-object',
  description:
    'The Link object represents a possible design-time link for a result. The presence of a link does not guarantee the caller’s ability to successfully invoke it, rather it provides a known relationship and traversal mechanism between results and other methods.',
};

const ErrorObject: NodeType = {
  properties: {
    code: {
      type: 'integer',
      description:
        'REQUIRED. A Number that indicates the error type that occurred. This MUST be an integer. The error codes from and including -32768 to -32000 are reserved for pre-defined errors. These pre-defined errors SHOULD be assumed to be returned from any JSON-RPC api.',
    },
    message: {
      type: 'string',
      description:
        'REQUIRED. A String providing a short description of the error. The message SHOULD be limited to a concise single sentence.',
    },
    data: {
      resolvable: false,
      description:
        'A Primitive or Structured value that contains additional information about the error. This may be omitted. The value of this member is defined by the Server (e.g. detailed error information, nested errors etc.).',
    },
  },
  required: ['code', 'message'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#error-object',
  description: 'Defines an application level error.',
};

const Components: NodeType = {
  properties: {
    contentDescriptors: 'NamedContentDescriptors',
    schemas: 'NamedSchemas',
    examples: 'NamedExamples',
    links: 'NamedLinks',
    errors: 'NamedErrors',
    examplePairingObjects: 'NamedExamplePairingObjects',
    tags: 'NamedTags',
  },
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#components-object',
  description:
    'Holds a set of reusable objects for different aspects of the OpenRPC. All objects defined within the components object will have no effect on the API unless they are explicitly referenced from properties outside the components object.',
};

const Tag: NodeType = {
  properties: {
    name: {
      type: 'string',
      description: 'REQUIRED. The name of the tag.',
    },
    summary: {
      type: 'string',
      description: 'A short summary of the tag.',
    },
    description: {
      type: 'string',
      description:
        'A verbose explanation for the tag. GitHub Flavored Markdown syntax MAY be used for rich text representation.',
    },
    externalDocs: 'ExternalDocs',
  },
  required: ['name'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#tag-object',
  description:
    'Adds metadata to a single tag that is used by the Method Object. It is not mandatory to have a Tag Object per tag defined in the Method Object instances.',
};

const ExternalDocs: NodeType = {
  properties: {
    description: {
      type: 'string',
      description:
        'A verbose explanation of the target documentation. GitHub Flavored Markdown syntax MAY be used for rich text representation.',
    },
    url: {
      type: 'string',
      description:
        'REQUIRED. The URL for the target documentation. Value MUST be in the format of a URL.',
    },
  },
  required: ['url'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.open-rpc.org/#external-documentation-object',
  description: 'Allows referencing an external resource for extended documentation.',
};

export const OpenRpcTypes = {
  Root,
  Info,
  Contact,
  License,
  Server,
  ServerList: listOf('Server'),
  ServerVariable,
  ServerVariablesMap: mapOf('ServerVariable'),
  Method,
  MethodList: listOf('Method'),
  ContentDescriptor,
  ContentDescriptorList: listOf('ContentDescriptor'),
  ExamplePairing,
  ExamplePairingList: listOf('ExamplePairing'),
  Example,
  ExampleList: listOf('Example'),
  Link,
  LinkList: listOf('Link'),
  ErrorObject,
  ErrorList: listOf('ErrorObject'),
  Components,
  Tag,
  TagList: listOf('Tag'),
  ExternalDocs,
  Schema,
  SchemaProperties,
  Dependencies,
  DiscriminatorMapping,
  Discriminator,
  NamedContentDescriptors: mapOf('ContentDescriptor'),
  NamedSchemas: mapOf('Schema'),
  NamedExamples: mapOf('Example'),
  NamedLinks: mapOf('Link'),
  NamedErrors: mapOf('ErrorObject'),
  NamedExamplePairingObjects: mapOf('ExamplePairing'),
  NamedTags: mapOf('Tag'),
} as const;
