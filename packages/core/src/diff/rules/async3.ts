import type { DiffRule } from '../types.js';
import { ChannelAddressChanged, ChannelRemoved } from './channel.js';
import { MessageContentTypeChanged, MessageRemoved } from './message.js';
import { OperationActionChanged, OperationRemoved } from './operation.js';
import { RefTargetChanged } from './ref.js';
import { schemaRules } from './schema.js';
import { ServerRemoved } from './server.js';

// An AsyncAPI 3 payload is a `Schema` node of the same shape the OpenAPI rules already
// judge, and its direction comes from the `action` of the operations that reference the
// channel (see `direction.ts`), so the whole schema rule set is reused as it is.
export const async3Rules = {
  'channel-removed': ChannelRemoved,
  'channel-address-changed': ChannelAddressChanged,
  'message-removed': MessageRemoved,
  'message-content-type-changed': MessageContentTypeChanged,
  'operation-removed': OperationRemoved,
  'operation-action-changed': OperationActionChanged,
  'server-removed': ServerRemoved,
  'ref-target-changed': RefTargetChanged,
  ...schemaRules,
} satisfies Record<string, DiffRule>;
