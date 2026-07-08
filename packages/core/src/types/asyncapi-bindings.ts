import { isPlainObject } from '../utils/is-plain-object.js';
import { listOf, type NodeType } from './index.js';

// AsyncAPI protocol bindings are versioned independently of the AsyncAPI specification
// (https://github.com/asyncapi/bindings) and shared between AsyncAPI 2.x and 3.x documents.
// Every named type here is referenced BY STRING NAME — never attach a NodeType by object
// reference: `normalizeTypes` returns unnamed objects as-is and the walker never descends
// into them (that latent bug hid broken binding validation for years).
//
// Most protocols are typed with real fields (http, kafka, amqp, mqtt, sns, sqs, etc.).
// Some protocols have no schema-defined fields per the official bindings spec and are
// intentionally reserved-empty (`properties: {}`): amqp1, mqtt5, stomp, redis, mercure, and
// the schema-less locations of http, ws, nats, and ros2.
// This catalog is a deliberate shared superset across AsyncAPI 2.x and 3.x: the official
// per-version JSON Schemas admit slightly different protocol/location combinations (e.g.
// `pulsar` has no operation/message binding, `mercure`/`mqtt5` are absent from the 3.x
// machine-readable schemas entirely), but typing a location the official schema omits only
// means we validate content that schema would otherwise accept unchecked via
// `additionalProperties` — tolerant-by-design, not a spec violation.
// The one genuinely version-exclusive protocol is `ros2`, introduced in AsyncAPI 3.1
// (the official 3.1.0 schema defines fields for server and operation bindings only;
// its channel and message bindings are deliberately modeled as reserved-empty objects).
// It is intentionally excluded from this shared catalog and attached only in
// `asyncapi3.ts` via `Ros2Bindings`, so AsyncAPI 2.x documents never admit it.

const HttpChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an HTTP channel.',
};

const HttpServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an HTTP server.',
};

const HttpMessageBinding: NodeType = {
  properties: {
    headers: 'Schema',
    statusCode: { type: 'number' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an HTTP message, i.e., a request or a response.',
};

const HttpOperationBinding: NodeType = {
  properties: {
    type: { type: 'string' }, // bindingVersion 0.1.0 (removed since 0.2.0)
    method: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'],
    },
    query: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an HTTP operation.',
};

const WsChannelBinding: NodeType = {
  properties: {
    method: { type: 'string' },
    query: 'Schema',
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a WebSockets channel.',
};

const WsServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a WebSockets server.',
};

const WsMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a WebSockets message.',
};

const WsOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a WebSockets operation.',
};

const KafkaTopicConfiguration: NodeType = {
  properties: {
    'cleanup.policy': { type: 'array', items: { enum: ['delete', 'compact'] } },
    'retention.ms': { type: 'integer' },
    'retention.bytes': { type: 'integer' },
    'delete.retention.ms': { type: 'integer' },
    'max.message.bytes': { type: 'integer' },
    'confluent.key.schema.validation': { type: 'boolean' },
    'confluent.key.subject.name.strategy': { type: 'string' },
    'confluent.value.schema.validation': { type: 'boolean' },
    'confluent.value.subject.name.strategy': { type: 'string' },
  },
};
const KafkaChannelBinding: NodeType = {
  properties: {
    topic: { type: 'string' },
    partitions: { type: 'integer' },
    replicas: { type: 'integer' },
    topicConfiguration: 'KafkaTopicConfiguration',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a Kafka channel.',
};

const KafkaServerBinding: NodeType = {
  properties: {
    schemaRegistryUrl: { type: 'string' },
    schemaRegistryVendor: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a Kafka server.',
};

const KafkaMessageBinding: NodeType = {
  properties: {
    key: 'Schema',
    schemaIdLocation: { type: 'string' },
    schemaIdPayloadEncoding: { type: 'string' },
    schemaLookupStrategy: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a Kafka message.',
};

const KafkaOperationBinding: NodeType = {
  properties: {
    groupId: 'Schema',
    clientId: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a Kafka operation.',
};

const AnypointmqChannelBinding: NodeType = {
  properties: {
    destination: { type: 'string' },
    destinationType: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an Anypoint MQ channel.',
};

const AnypointmqServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an Anypoint MQ server.',
};

const AnypointmqMessageBinding: NodeType = {
  properties: {
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an Anypoint MQ message.',
};

const AnypointmqOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an Anypoint MQ operation.',
};

const AmqpChannelExchange: NodeType = {
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['topic', 'direct', 'fanout', 'default', 'headers'] },
    durable: { type: 'boolean' },
    autoDelete: { type: 'boolean' },
    vhost: { type: 'string' },
  },
  description: 'The AMQP exchange the channel is bound to.',
};

const AmqpChannelQueue: NodeType = {
  properties: {
    name: { type: 'string' },
    durable: { type: 'boolean' },
    exclusive: { type: 'boolean' },
    autoDelete: { type: 'boolean' },
    vhost: { type: 'string' },
  },
  description: 'The AMQP queue the channel is bound to.',
};

const AmqpChannelBinding: NodeType = {
  properties: {
    is: { type: 'string', enum: ['queue', 'routingKey'] },
    exchange: 'AmqpChannelExchange',
    queue: 'AmqpChannelQueue',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an AMQP 0-9-1 channel.',
};

const AmqpServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an AMQP 0-9-1 server.',
};

const AmqpMessageBinding: NodeType = {
  properties: {
    contentEncoding: { type: 'string' },
    messageType: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an AMQP 0-9-1 message.',
};

const AmqpOperationBinding: NodeType = {
  properties: {
    expiration: { type: 'integer' },
    userId: { type: 'string' },
    cc: { type: 'array', items: { type: 'string' } },
    priority: { type: 'integer' },
    deliveryMode: { type: 'integer' },
    mandatory: { type: 'boolean' },
    bcc: { type: 'array', items: { type: 'string' } },
    replyTo: { type: 'string' }, // bindingVersion 0.2.0 (removed in 0.3.0)
    timestamp: { type: 'boolean' },
    ack: { type: 'boolean' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an AMQP 0-9-1 operation.',
};

const Amqp1ChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an AMQP 1.0 channel.',
};

const Amqp1ServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an AMQP 1.0 server.',
};

const Amqp1MessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an AMQP 1.0 message.',
};

const Amqp1OperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an AMQP 1.0 operation.',
};

const MqttChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an MQTT channel.',
};

const MqttServerBindingLastWill: NodeType = {
  properties: {
    topic: { type: 'string' },
    qos: { type: 'integer' },
    message: { type: 'string' },
    retain: { type: 'boolean' },
  },
};
const MqttServerBinding: NodeType = {
  properties: {
    clientId: { type: 'string' },
    cleanSession: { type: 'boolean' },
    lastWill: 'MqttServerBindingLastWill',
    keepAlive: { type: 'integer' },
    sessionExpiryInterval: (value: unknown) =>
      isPlainObject(value) ? 'Schema' : { type: 'integer' },
    maximumPacketSize: (value: unknown) => (isPlainObject(value) ? 'Schema' : { type: 'integer' }),
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an MQTT server.',
};

const MqttMessageBinding: NodeType = {
  properties: {
    payloadFormatIndicator: { type: 'integer' }, // 0 or 1
    correlationData: 'Schema',
    contentType: { type: 'string' },
    responseTopic: (value: unknown) => (isPlainObject(value) ? 'Schema' : { type: 'string' }),
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an MQTT message.',
};

const MqttOperationBinding: NodeType = {
  properties: {
    qos: { type: 'integer' },
    retain: { type: 'boolean' },
    messageExpiryInterval: (value: unknown) =>
      isPlainObject(value) ? 'Schema' : { type: 'integer' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an MQTT operation.',
};

const Mqtt5ChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an MQTT 5 channel.',
};

const Mqtt5ServerBinding: NodeType = {
  properties: {
    // defined by the mqtt5 binding README (no JSON Schema was ever published for mqtt5)
    sessionExpiryInterval: (value: unknown) =>
      isPlainObject(value) ? 'Schema' : { type: 'integer' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an MQTT 5 server.',
};

const Mqtt5MessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an MQTT 5 message.',
};

const Mqtt5OperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for an MQTT 5 operation.',
};

const NatsChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a NATS channel.',
};

const NatsServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a NATS server.',
};

const NatsMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a NATS message.',
};

const NatsOperationBinding: NodeType = {
  properties: {
    queue: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a NATS operation.',
};

const JmsChannelBinding: NodeType = {
  properties: {
    destination: { type: 'string' },
    destinationType: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a JMS channel.',
};

const JmsServerBindingProperty: NodeType = {
  properties: {
    name: { type: 'string' },
    value: {},
  },
  required: ['name', 'value'],
  description: 'A name-value pair to set on the JMS ConnectionFactory implementation.',
};

const JmsServerBinding: NodeType = {
  properties: {
    jmsConnectionFactory: { type: 'string' },
    properties: listOf('JmsServerBindingProperty'),
    clientID: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  required: ['jmsConnectionFactory'],
  description: 'Protocol-specific information for a JMS server.',
};

const JmsMessageBinding: NodeType = {
  properties: {
    headers: 'Schema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a JMS message.',
};

const JmsOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a JMS operation.',
};

// solace
const SolaceChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Solace channel.',
};

const SolaceServerBinding: NodeType = {
  properties: {
    bindingVersion: { type: 'string' },
    msgVpn: { type: 'string' },
    clientName: { type: 'string' },
  },
  description: 'Protocol-specific information for a Solace server.',
};

const SolaceMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Solace message.',
};

const SolaceDestination: NodeType = {
  properties: {
    destinationType: { type: 'string', enum: ['queue', 'topic'] },
    deliveryMode: { type: 'string', enum: ['direct', 'persistent'] },
    'queue.name': { type: 'string' },
    'queue.topicSubscriptions': { type: 'array', items: { type: 'string' } },
    'queue.accessType': { type: 'string', enum: ['exclusive', 'nonexclusive'] },
    'queue.maxMsgSpoolSize': { type: 'string' },
    'queue.maxMsgSpoolUsage': { type: 'string' },
    'queue.maxTtl': { type: 'string' },
    'topic.topicSubscriptions': { type: 'array', items: { type: 'string' } },
  },
};
const SolaceOperationBinding: NodeType = {
  properties: {
    bindingVersion: { type: 'string' },
    destinations: listOf('SolaceDestination'),
    dmqEligible: { type: 'boolean' },
    priority: { type: 'integer', minimum: 0 },
    timeToLive: { type: 'integer' },
  },
  description: 'Protocol-specific information for a Solace operation.',
};

const SnsIdentifier: NodeType = {
  properties: {
    url: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    arn: { type: 'string' },
    name: { type: 'string' },
  },
  description: 'Identifies an SNS resource: exactly one of url, email, phone, arn, or name.',
};

const SnsOrdering: NodeType = {
  properties: {
    type: { type: 'string', enum: ['standard', 'FIFO'] },
    contentBasedDeduplication: { type: 'boolean' },
  },
  required: ['type'],
  description: 'Defines the ordering and deduplication properties of an SNS topic.',
};

const SnsStatement: NodeType = {
  properties: {
    effect: { type: 'string', enum: ['Allow', 'Deny'] },
    principal: {},
    action: {},
    resource: {},
    condition: { type: 'object' },
  },
  required: ['effect', 'principal', 'action'],
  description: 'An SNS access-policy statement.',
};

const SnsPolicy: NodeType = {
  properties: {
    statements: listOf('SnsStatement'),
  },
  required: ['statements'],
  description: 'The security policy for an SNS topic.',
};

const SnsChannelBinding: NodeType = {
  properties: {
    name: { type: 'string' },
    ordering: 'SnsOrdering',
    policy: 'SnsPolicy',
    tags: { type: 'object' },
    bindingVersion: { type: 'string' },
  },
  required: ['name'],
  description: 'Protocol-specific information for an SNS channel.',
};

const SnsRedrivePolicy: NodeType = {
  properties: {
    deadLetterQueue: 'SnsIdentifier',
    maxReceiveCount: { type: 'integer' },
  },
  required: ['deadLetterQueue'],
  description: 'Defines where unprocessable SNS messages are moved.',
};

const SnsDeliveryPolicy: NodeType = {
  properties: {
    minDelayTarget: { type: 'integer' },
    maxDelayTarget: { type: 'integer' },
    numRetries: { type: 'integer' },
    numNoDelayRetries: { type: 'integer' },
    numMinDelayRetries: { type: 'integer' },
    numMaxDelayRetries: { type: 'integer' },
    backoffFunction: {
      type: 'string',
      enum: ['arithmetic', 'exponential', 'geometric', 'linear'],
    },
    maxReceivesPerSecond: { type: 'integer' },
  },
  description: 'Defines how SNS retries the delivery of messages to a subscription endpoint.',
};

const SnsConsumer: NodeType = {
  properties: {
    protocol: {
      type: 'string',
      enum: [
        'http',
        'https',
        'email',
        'email-json',
        'sms',
        'sqs',
        'application',
        'lambda',
        'firehose',
      ],
    },
    endpoint: 'SnsIdentifier',
    filterPolicy: { type: 'object' },
    filterPolicyScope: { type: 'string', enum: ['MessageAttributes', 'MessageBody'] },
    rawMessageDelivery: { type: 'boolean' },
    redrivePolicy: 'SnsRedrivePolicy',
    deliveryPolicy: 'SnsDeliveryPolicy',
    displayName: { type: 'string' },
  },
  required: ['protocol', 'endpoint', 'rawMessageDelivery'],
  description: 'Describes an SNS subscription consuming messages from a topic.',
};

const SnsOperationBinding: NodeType = {
  properties: {
    topic: 'SnsIdentifier',
    consumers: listOf('SnsConsumer'),
    deliveryPolicy: 'SnsDeliveryPolicy',
    bindingVersion: { type: 'string' },
  },
  required: ['consumers'],
  description: 'Protocol-specific information for an SNS operation.',
};

// sqs
const SqsIdentifier: NodeType = {
  properties: {
    arn: { type: 'string' },
    name: { type: 'string' },
  },
  description: 'Identifies an SQS queue: exactly one of arn or name.',
};

const SqsRedrivePolicy: NodeType = {
  properties: {
    deadLetterQueue: 'SqsIdentifier',
    maxReceiveCount: { type: 'integer' },
  },
  required: ['deadLetterQueue'],
  description: 'Defines where unprocessable SQS messages are moved.',
};

const SqsStatement: NodeType = {
  properties: {
    effect: { type: 'string', enum: ['Allow', 'Deny'] },
    principal: {}, // string, or an object keyed by AWS or Service — not deep-linted
    action: {}, // string or array of strings — not deep-linted
    resource: {}, // string or array of strings — not deep-linted
    condition: { type: 'object' },
  },
  required: ['effect', 'principal', 'action'],
  description: 'An SQS access-policy statement.',
};

const SqsPolicy: NodeType = {
  properties: {
    statements: listOf('SqsStatement'),
  },
  required: ['statements'],
  description: 'The security policy for an SQS queue.',
};

const SqsQueue: NodeType = {
  properties: {
    name: { type: 'string' },
    fifoQueue: { type: 'boolean' },
    deduplicationScope: { type: 'string', enum: ['queue', 'messageGroup'] },
    fifoThroughputLimit: { type: 'string', enum: ['perQueue', 'perMessageGroupId'] },
    deliveryDelay: { type: 'integer' },
    visibilityTimeout: { type: 'integer' },
    receiveMessageWaitTime: { type: 'integer' },
    messageRetentionPeriod: { type: 'integer' },
    redrivePolicy: 'SqsRedrivePolicy',
    policy: 'SqsPolicy',
    tags: { type: 'object' },
  },
  required: ['name', 'fifoQueue'],
  description: 'Describes an SQS queue (channel-level definition).',
};

const SqsOperationQueue: NodeType = {
  ...SqsQueue,
  required: ['name'],
  description: 'Describes an SQS queue (operation-level definition).',
};

const SqsChannelBinding: NodeType = {
  properties: {
    queue: 'SqsQueue',
    deadLetterQueue: 'SqsQueue',
    bindingVersion: { type: 'string' },
  },
  required: ['queue'],
  description: 'Protocol-specific information for an SQS channel.',
};

const SqsOperationBinding: NodeType = {
  properties: {
    queues: listOf('SqsOperationQueue'),
    bindingVersion: { type: 'string' },
  },
  required: ['queues'],
  description: 'Protocol-specific information for an SQS operation.',
};

const StompChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a STOMP channel.',
};

const StompServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a STOMP server.',
};

const StompMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a STOMP message.',
};

const StompOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a STOMP operation.',
};

const RedisChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Redis channel.',
};

const RedisServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Redis server.',
};

const RedisMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Redis message.',
};

const RedisOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Redis operation.',
};

const MercureChannelBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Mercure channel.',
};

const MercureServerBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Mercure server.',
};

const MercureMessageBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Mercure message.',
};

const MercureOperationBinding: NodeType = {
  properties: {}, // empty object
  description: 'Protocol-specific information for a Mercure operation.',
};

const IbmmqServerBinding: NodeType = {
  properties: {
    groupId: { type: 'string' },
    ccdtQueueManagerName: { type: 'string' },
    cipherSpec: { type: 'string' },
    multiEndpointServer: { type: 'boolean' },
    heartBeatInterval: { type: 'integer' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an IBM MQ server.',
};

const IbmmqChannelQueue: NodeType = {
  properties: {
    objectName: { type: 'string' },
    isPartitioned: { type: 'boolean' },
    exclusive: { type: 'boolean' },
  },
  required: ['objectName'],
  description: 'Defines the properties of an IBM MQ queue.',
};

const IbmmqChannelTopic: NodeType = {
  properties: {
    string: { type: 'string' },
    objectName: { type: 'string' },
    durablePermitted: { type: 'boolean' },
    lastMsgRetained: { type: 'boolean' },
  },
  description: 'Defines the properties of an IBM MQ topic.',
};

const IbmmqChannelBinding: NodeType = {
  properties: {
    destinationType: { type: 'string', enum: ['topic', 'queue'] },
    queue: 'IbmmqChannelQueue',
    topic: 'IbmmqChannelTopic',
    maxMsgLength: { type: 'integer' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an IBM MQ channel.',
};

const IbmmqMessageBinding: NodeType = {
  properties: {
    type: { type: 'string', enum: ['string', 'jms', 'binary'] },
    headers: { type: 'string' },
    description: { type: 'string' },
    expiry: { type: 'integer' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for an IBM MQ message.',
};

const GooglepubsubMessageStoragePolicy: NodeType = {
  properties: {
    allowedPersistenceRegions: { type: 'array', items: { type: 'string' } },
  },
  description: 'Policy constraining the regions where Google Cloud Pub/Sub messages are stored.',
};

const GooglepubsubSchemaSettings: NodeType = {
  properties: {
    encoding: { type: 'string' },
    firstRevisionId: { type: 'string' },
    lastRevisionId: { type: 'string' },
    name: { type: 'string' },
  },
  required: ['encoding', 'name'],
  description: 'Settings for validating Google Cloud Pub/Sub messages against a schema.',
};

const GooglepubsubChannelBinding: NodeType = {
  properties: {
    labels: { type: 'object' },
    messageRetentionDuration: { type: 'string' },
    messageStoragePolicy: 'GooglepubsubMessageStoragePolicy',
    schemaSettings: 'GooglepubsubSchemaSettings',
    topic: { type: 'string' }, // only in bindingVersion 0.1.0
    bindingVersion: { type: 'string' },
  },
  required: ['schemaSettings'],
  description: 'Protocol-specific information for a Google Cloud Pub/Sub channel.',
};

const GooglepubsubSchema: NodeType = {
  properties: {
    name: { type: 'string' },
    type: { type: 'string' }, // bindingVersion 0.1.0
  },
  required: ['name'],
  description: 'Identifies the Google Cloud Pub/Sub schema a message is validated against.',
};

const GooglepubsubMessageBinding: NodeType = {
  properties: {
    attributes: { type: 'object' },
    orderingKey: { type: 'string' },
    schema: 'GooglepubsubSchema',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a Google Cloud Pub/Sub message.',
};

const PulsarServerBinding: NodeType = {
  properties: {
    tenant: { type: 'string' },
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a Pulsar server.',
};

const PulsarRetention: NodeType = {
  properties: {
    time: { type: 'integer' },
    size: { type: 'integer' },
  },
  description: 'The retention policy of a Pulsar topic.',
};

const PulsarChannelBinding: NodeType = {
  properties: {
    namespace: { type: 'string' },
    persistence: { type: 'string', enum: ['persistent', 'non-persistent'] },
    compaction: { type: 'integer' },
    'geo-replication': { type: 'array', items: { type: 'string' } },
    retention: 'PulsarRetention',
    ttl: { type: 'integer' },
    deduplication: { type: 'boolean' },
    bindingVersion: { type: 'string' },
  },
  required: ['namespace', 'persistence'],
  description: 'Protocol-specific information for a Pulsar channel.',
};

const Ros2ServerBinding: NodeType = {
  properties: {
    rmwImplementation: { type: 'string' },
    domainId: { type: 'integer', minimum: 0 },
  },
  description: 'Protocol-specific information for a ROS 2 server.',
};

const Ros2ChannelBinding: NodeType = {
  properties: {},
  description: 'Protocol-specific information for a ROS 2 channel.',
};

const Ros2QosPolicies: NodeType = {
  properties: {
    reliability: { type: 'string', enum: ['best_effort', 'reliable'] },
    history: { type: 'string', enum: ['keep_last', 'keep_all', 'unknown'] },
    durability: { type: 'string', enum: ['transient_local', 'volatile'] },
    lifespan: { type: 'integer' },
    deadline: { type: 'integer' },
    liveliness: { type: 'string', enum: ['automatic', 'manual'] },
    leaseDuration: { type: 'integer' },
  },
  description: 'Quality of Service settings for a ROS 2 operation.',
};

const Ros2OperationBinding: NodeType = {
  properties: {
    role: {
      type: 'string',
      enum: [
        'publisher',
        'subscriber',
        'service_client',
        'service_server',
        'action_client',
        'action_server',
      ],
    },
    node: { type: 'string' },
    qosPolicies: 'Ros2QosPolicies',
    bindingVersion: { type: 'string' },
  },
  description: 'Protocol-specific information for a ROS 2 operation.',
};

const Ros2MessageBinding: NodeType = {
  properties: {},
  description: 'Protocol-specific information for a ROS 2 message.',
};

export const ServerBindings: NodeType = {
  properties: {
    http: 'HttpServerBinding',
    ws: 'WsServerBinding',
    kafka: 'KafkaServerBinding',
    anypointmq: 'AnypointmqServerBinding',
    amqp: 'AmqpServerBinding',
    amqp1: 'Amqp1ServerBinding',
    mqtt: 'MqttServerBinding',
    mqtt5: 'Mqtt5ServerBinding',
    nats: 'NatsServerBinding',
    jms: 'JmsServerBinding',
    solace: 'SolaceServerBinding',
    stomp: 'StompServerBinding',
    redis: 'RedisServerBinding',
    mercure: 'MercureServerBinding',
    ibmmq: 'IbmmqServerBinding',
    pulsar: 'PulsarServerBinding',
  },
  additionalProperties: { type: 'object' },
  description: 'Map describing protocol-specific definitions for a server.',
};

export const ChannelBindings: NodeType = {
  properties: {
    http: 'HttpChannelBinding',
    ws: 'WsChannelBinding',
    kafka: 'KafkaChannelBinding',
    anypointmq: 'AnypointmqChannelBinding',
    amqp: 'AmqpChannelBinding',
    amqp1: 'Amqp1ChannelBinding',
    mqtt: 'MqttChannelBinding',
    mqtt5: 'Mqtt5ChannelBinding',
    nats: 'NatsChannelBinding',
    jms: 'JmsChannelBinding',
    solace: 'SolaceChannelBinding',
    stomp: 'StompChannelBinding',
    redis: 'RedisChannelBinding',
    mercure: 'MercureChannelBinding',
    sns: 'SnsChannelBinding',
    sqs: 'SqsChannelBinding',
    ibmmq: 'IbmmqChannelBinding',
    googlepubsub: 'GooglepubsubChannelBinding',
    pulsar: 'PulsarChannelBinding',
  },
  additionalProperties: { type: 'object' },
  description: 'Map describing protocol-specific definitions for a channel.',
};

export const OperationBindings: NodeType = {
  properties: {
    http: 'HttpOperationBinding',
    ws: 'WsOperationBinding',
    kafka: 'KafkaOperationBinding',
    anypointmq: 'AnypointmqOperationBinding',
    amqp: 'AmqpOperationBinding',
    amqp1: 'Amqp1OperationBinding',
    mqtt: 'MqttOperationBinding',
    mqtt5: 'Mqtt5OperationBinding',
    nats: 'NatsOperationBinding',
    jms: 'JmsOperationBinding',
    solace: 'SolaceOperationBinding',
    stomp: 'StompOperationBinding',
    redis: 'RedisOperationBinding',
    mercure: 'MercureOperationBinding',
    sns: 'SnsOperationBinding',
    sqs: 'SqsOperationBinding',
  },
  additionalProperties: { type: 'object' },
  description: 'Map describing protocol-specific definitions for an operation.',
};

export const MessageBindings: NodeType = {
  properties: {
    http: 'HttpMessageBinding',
    ws: 'WsMessageBinding',
    kafka: 'KafkaMessageBinding',
    anypointmq: 'AnypointmqMessageBinding',
    amqp: 'AmqpMessageBinding',
    amqp1: 'Amqp1MessageBinding',
    mqtt: 'MqttMessageBinding',
    mqtt5: 'Mqtt5MessageBinding',
    nats: 'NatsMessageBinding',
    jms: 'JmsMessageBinding',
    solace: 'SolaceMessageBinding',
    stomp: 'StompMessageBinding',
    redis: 'RedisMessageBinding',
    mercure: 'MercureMessageBinding',
    ibmmq: 'IbmmqMessageBinding',
    googlepubsub: 'GooglepubsubMessageBinding',
  },
  additionalProperties: { type: 'object' },
  description: 'Map describing protocol-specific definitions for a message.',
};

export const AsyncApiBindings: Record<string, NodeType> = {
  HttpServerBinding,
  HttpChannelBinding,
  HttpMessageBinding,
  HttpOperationBinding,

  WsServerBinding,
  WsChannelBinding,
  WsMessageBinding,
  WsOperationBinding,

  KafkaServerBinding,
  KafkaTopicConfiguration,
  KafkaChannelBinding,
  KafkaMessageBinding,
  KafkaOperationBinding,

  AnypointmqServerBinding,
  AnypointmqChannelBinding,
  AnypointmqMessageBinding,
  AnypointmqOperationBinding,

  AmqpServerBinding,
  AmqpChannelExchange,
  AmqpChannelQueue,
  AmqpChannelBinding,
  AmqpMessageBinding,
  AmqpOperationBinding,

  Amqp1ServerBinding,
  Amqp1ChannelBinding,
  Amqp1MessageBinding,
  Amqp1OperationBinding,

  MqttServerBindingLastWill,
  MqttServerBinding,
  MqttChannelBinding,
  MqttMessageBinding,
  MqttOperationBinding,

  Mqtt5ServerBinding,
  Mqtt5ChannelBinding,
  Mqtt5MessageBinding,
  Mqtt5OperationBinding,

  NatsServerBinding,
  NatsChannelBinding,
  NatsMessageBinding,
  NatsOperationBinding,

  JmsServerBindingProperty,
  JmsServerBinding,
  JmsChannelBinding,
  JmsMessageBinding,
  JmsOperationBinding,

  SolaceServerBinding,
  SolaceChannelBinding,
  SolaceMessageBinding,
  SolaceDestination,
  SolaceOperationBinding,

  StompServerBinding,
  StompChannelBinding,
  StompMessageBinding,
  StompOperationBinding,

  RedisServerBinding,
  RedisChannelBinding,
  RedisMessageBinding,
  RedisOperationBinding,

  MercureServerBinding,
  MercureChannelBinding,
  MercureMessageBinding,
  MercureOperationBinding,

  SnsIdentifier,
  SnsOrdering,
  SnsStatement,
  SnsPolicy,
  SnsChannelBinding,
  SnsRedrivePolicy,
  SnsDeliveryPolicy,
  SnsConsumer,
  SnsOperationBinding,

  SqsIdentifier,
  SqsRedrivePolicy,
  SqsStatement,
  SqsPolicy,
  SqsQueue,
  SqsOperationQueue,
  SqsChannelBinding,
  SqsOperationBinding,

  IbmmqServerBinding,
  IbmmqChannelQueue,
  IbmmqChannelTopic,
  IbmmqChannelBinding,
  IbmmqMessageBinding,

  GooglepubsubMessageStoragePolicy,
  GooglepubsubSchemaSettings,
  GooglepubsubChannelBinding,
  GooglepubsubSchema,
  GooglepubsubMessageBinding,

  PulsarServerBinding,
  PulsarRetention,
  PulsarChannelBinding,

  ServerBindings,
  ChannelBindings,
  MessageBindings,
  OperationBindings,
};

export const Ros2Bindings: Record<string, NodeType> = {
  Ros2ServerBinding,
  Ros2ChannelBinding,
  Ros2OperationBinding,
  Ros2QosPolicies,
  Ros2MessageBinding,
};
