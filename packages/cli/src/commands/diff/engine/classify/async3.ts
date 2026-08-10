import type { DiffRuleRegistry } from '../types.js';
import { channelAddressChanged, channelRemoved } from './rules/channel.js';
import { messageContentTypeChanged, messageRemoved } from './rules/message.js';
import { operationActionChanged, operationRemoved } from './rules/operation.js';
import { refTargetChanged } from './rules/ref.js';
import { schemaRules } from './rules/schema.js';
import { serverRemoved } from './rules/server.js';

// An AsyncAPI 3 payload is a `Schema` node of the same shape the OpenAPI rules already
// judge, and its direction comes from the `action` of the operations that reference the
// channel (see `polarity.ts`), so the whole schema rule set is reused as it is.
export const async3Rules: DiffRuleRegistry = {
  Channel: [channelRemoved, channelAddressChanged, refTargetChanged],
  NamedChannels: [channelRemoved],
  Message: [messageRemoved, messageContentTypeChanged, refTargetChanged],
  NamedMessages: [messageRemoved],
  Operation: [operationRemoved, operationActionChanged, refTargetChanged],
  Server: [serverRemoved],
  ServerMap: [serverRemoved],
  Schema: [...schemaRules, refTargetChanged],
};
