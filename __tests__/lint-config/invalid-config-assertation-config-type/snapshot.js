// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint-config test with option: { dirName: 'invalid-config-assertation-config-type', option: 'warn' } 1`] = `


The 'assert/' syntax in assert/path-item-mutually-required is deprecated. Update your configuration to use 'rule/' instead. Examples and more information: https://redocly.com/docs/cli/rules/configurable-rules/
[1] .redocly.yaml:9:17 at #/rules/assert~1path-item-mutually-required/where/0/subject/type

\`type\` can be one of the following only: "any", "Root", "Tag", "TagList", "TagGroups", "TagGroup", "ExternalDocs", "Example", "ExamplesMap", "EnumDescriptions", "SecurityRequirement", "SecurityRequirementList", "Info", "Contact", "License", "Logo", "Paths", "PathItem", "Parameter", "ParameterItems", "ParameterList", "Operation", "Examples", "Header", "Responses", "Response", "Schema", "Xml", "SchemaProperties", "NamedSchemas", "NamedResponses", "NamedParameters", "NamedSecuritySchemes", "SecurityScheme", "XCodeSample", "XCodeSampleList", "XServerList", "XServer", "Server", "ServerList", "ServerVariable", "ServerVariablesMap", "Callback", "CallbacksMap", "RequestBody", "MediaTypesMap", "MediaType", "Encoding", "EncodingMap", "HeadersMap", "Link", "DiscriminatorMapping", "Discriminator", "Components", "LinksMap", "NamedExamples", "NamedRequestBodies", "NamedHeaders", "NamedLinks", "NamedCallbacks", "ImplicitFlow", "PasswordFlow", "ClientCredentials", "AuthorizationCode", "OAuth2Flows", "XUsePkce", "WebhooksMap", "NamedPathItems", "DependentRequired", "ServerMap", "HttpServerBinding", "HttpChannelBinding", "HttpMessageBinding", "HttpOperationBinding", "WsServerBinding", "WsChannelBinding", "WsMessageBinding", "WsOperationBinding", "KafkaServerBinding", "KafkaTopicConfiguration", "KafkaChannelBinding", "KafkaMessageBinding", "KafkaOperationBinding", "AnypointmqServerBinding", "AnypointmqChannelBinding", "AnypointmqMessageBinding", "AnypointmqOperationBinding", "AmqpServerBinding", "AmqpChannelBinding", "AmqpMessageBinding", "AmqpOperationBinding", "Amqp1ServerBinding", "Amqp1ChannelBinding", "Amqp1MessageBinding", "Amqp1OperationBinding", "MqttServerBindingLastWill", "MqttServerBinding", "MqttChannelBinding", "MqttMessageBinding", "MqttOperationBinding", "Mqtt5ServerBinding", "Mqtt5ChannelBinding", "Mqtt5MessageBinding", "Mqtt5OperationBinding", "NatsServerBinding", "NatsChannelBinding", "NatsMessageBinding", "NatsOperationBinding", "JmsServerBinding", "JmsChannelBinding", "JmsMessageBinding", "JmsOperationBinding", "SolaceServerBinding", "SolaceChannelBinding", "SolaceMessageBinding", "SolaceDestination", "SolaceOperationBinding", "StompServerBinding", "StompChannelBinding", "StompMessageBinding", "StompOperationBinding", "RedisServerBinding", "RedisChannelBinding", "RedisMessageBinding", "RedisOperationBinding", "MercureServerBinding", "MercureChannelBinding", "MercureMessageBinding", "MercureOperationBinding", "ServerBindings", "ChannelBindings", "ChannelMap", "Channel", "ParametersMap", "MessageExample", "NamedMessages", "NamedMessageTraits", "NamedOperationTraits", "NamedCorrelationIds", "NamedStreamHeaders", "SecuritySchemeFlows", "Message", "MessageBindings", "OperationBindings", "OperationTrait", "OperationTraitList", "MessageTrait", "MessageTraitList", "CorrelationId", "Root.info", "Root.sourceDescriptions_items_0", "Root.sourceDescriptions_items_1", "Root.sourceDescriptions_items_2", "Root.sourceDescriptions", "Root.x-parameters_items.examples_1", "Root.x-parameters_items", "Root.x-parameters", "Root.workflows_items.parameters_items.examples_1", "Root.workflows_items.parameters_items", "Root.workflows_items.parameters", "Root.workflows_items.inputs", "Root.workflows_items.outputs", "Root.workflows_items.steps_items.parameters_items.examples_1", "Root.workflows_items.steps_items.parameters_items", "Root.workflows_items.steps_items.parameters", "Root.workflows_items.steps_items.successCriteria_items", "Root.workflows_items.steps_items.successCriteria", "Root.workflows_items.steps_items.onSuccess_items.criteria_items", "Root.workflows_items.steps_items.onSuccess_items.criteria", "Root.workflows_items.steps_items.onSuccess_items", "Root.workflows_items.steps_items.onSuccess", "Root.workflows_items.steps_items.onFailure_items.criteria_items", "Root.workflows_items.steps_items.onFailure_items.criteria", "Root.workflows_items.steps_items.onFailure_items", "Root.workflows_items.steps_items.onFailure", "Root.workflows_items.steps_items.outputs", "Root.workflows_items.steps_items.x-expect", "Root.workflows_items.steps_items.x-operation", "Root.workflows_items.steps_items.requestBody.replacements_items", "Root.workflows_items.steps_items.requestBody.replacements", "Root.workflows_items.steps_items.requestBody", "Root.workflows_items.steps_items", "Root.workflows_items.steps", "Root.workflows_items.successActions_items.criteria_items", "Root.workflows_items.successActions_items.criteria", "Root.workflows_items.successActions_items", "Root.workflows_items.successActions", "Root.workflows_items.failureActions_items.criteria_items", "Root.workflows_items.failureActions_items.criteria", "Root.workflows_items.failureActions_items", "Root.workflows_items.failureActions", "Root.workflows_items", "Root.workflows", "Root.components.inputs_additionalProperties", "Root.components.inputs", "Root.components.parameters_additionalProperties.examples_1", "Root.components.parameters_additionalProperties", "Root.components.parameters", "Root.components.successActions_additionalProperties.criteria_items", "Root.components.successActions_additionalProperties.criteria", "Root.components.successActions_additionalProperties", "Root.components.successActions", "Root.components.failureActions_additionalProperties.criteria_items", "Root.components.failureActions_additionalProperties.criteria", "Root.components.failureActions_additionalProperties", "Root.components.failureActions", "Root.components", "SpecExtension".

 7 | where:
 8 |   - subject:
 9 |       type: Invalid-type
   |             ^^^^^^^^^^^^
10 |       property: property
11 |     assertions:

Warning was generated by the configuration spec rule.


⚠️ Your config has 1 warning.
validating ../__fixtures__/valid-openapi.yaml...
../__fixtures__/valid-openapi.yaml: validated in <test>ms

Woohoo! Your API description is valid. 🎉


`;
