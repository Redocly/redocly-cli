import { isRef } from '../../ref-utils.js';
import type { Async3Operation, Channel } from '../../typings/asyncapi3.js';
import type { Async3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const DOCS_REFERENCE = 'https://redocly.com/docs/cli/rules/async/spec-ref-targets';
const ROOT_CHANNEL_POINTER = /^#\/channels\/[^/]+$/;
const ROOT_SERVER_POINTER = /^#\/servers\/[^/]+$/;

// Refs with a file part are skipped: in multi-file documents they become
// internal pointers only after bundling.
function internalPointer(node: unknown): string | undefined {
  return isRef(node) && node.$ref.startsWith('#/') ? node.$ref : undefined;
}

function reportMessagesOutsideChannel(
  subject: 'Operation' | 'Operation reply',
  messages: unknown,
  channelPointer: string | undefined,
  { report, location }: UserContext
) {
  if (!channelPointer || !Array.isArray(messages)) return;

  const messagesPrefix = `${channelPointer}/messages/`;
  for (const [messageIndex, message] of messages.entries()) {
    const messagePointer = internalPointer(message);
    if (!messagePointer) continue;

    const messageName = messagePointer.startsWith(messagesPrefix)
      ? messagePointer.slice(messagesPrefix.length)
      : '';
    if (messageName === '' || messageName.includes('/')) {
      report({
        message: `${subject} \`messages\` must reference messages of the referenced channel (\`${messagesPrefix}...\`).`,
        location: location.child(['messages', messageIndex, '$ref']),
        reference: DOCS_REFERENCE,
      });
    }
  }
}

export const SpecRefTargets: Async3Rule = () => {
  return {
    Operation(operation: Async3Operation, ctx: UserContext) {
      const channelPointer = internalPointer(operation.channel);

      // Operations defined in `components.operations` may reference any channel.
      if (
        ctx.location.pointer.startsWith('#/operations/') &&
        channelPointer &&
        !ROOT_CHANNEL_POINTER.test(channelPointer)
      ) {
        ctx.report({
          message: 'Operation `channel` must reference a channel from the root `channels` object.',
          location: ctx.location.child(['channel', '$ref']),
          reference: DOCS_REFERENCE,
        });
      }

      reportMessagesOutsideChannel('Operation', operation.messages, channelPointer, ctx);
    },
    OperationReply(reply: Record<string, unknown>, ctx: UserContext) {
      const channelPointer = internalPointer(reply.channel);

      // Replies defined in `components` may reference any channel.
      if (
        ctx.location.pointer.startsWith('#/operations/') &&
        channelPointer &&
        !ROOT_CHANNEL_POINTER.test(channelPointer)
      ) {
        ctx.report({
          message:
            'Operation reply `channel` must reference a channel from the root `channels` object.',
          location: ctx.location.child(['channel', '$ref']),
          reference: DOCS_REFERENCE,
        });
      }

      reportMessagesOutsideChannel('Operation reply', reply.messages, channelPointer, ctx);
    },
    Channel(channel: Channel, { report, location }: UserContext) {
      // Channels defined in `components.channels` may reference any server.
      if (!location.pointer.startsWith('#/channels/') || !Array.isArray(channel.servers)) {
        return;
      }

      for (const [serverIndex, server] of channel.servers.entries()) {
        const serverPointer = internalPointer(server);
        if (serverPointer && !ROOT_SERVER_POINTER.test(serverPointer)) {
          report({
            message: 'Channel `servers` must reference servers from the root `servers` object.',
            location: location.child(['servers', serverIndex, '$ref']),
            reference: DOCS_REFERENCE,
          });
        }
      }
    },
  };
};
