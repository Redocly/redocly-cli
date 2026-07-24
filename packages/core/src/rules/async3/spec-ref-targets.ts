import { isRef, parseRef } from '../../ref-utils.js';
import type { Async3Definition, Async3Operation, Channel } from '../../typings/asyncapi3.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Async3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const DOCS_REFERENCE = 'https://redocly.com/docs/cli/rules/async/spec-ref-targets';

function internalPointer(node: unknown): string | undefined {
  return isRef(node) && parseRef(node.$ref).uri === null ? node.$ref : undefined;
}

function isRootSectionPointer(pointer: string, section: 'channels' | 'servers') {
  const segments = parseRef(pointer).pointer;
  return segments.length === 2 && segments[0] === section;
}

function isChannelMessagePointer(messagePointer: string, channelPointer: string) {
  const messageSegments = parseRef(messagePointer).pointer;
  const channelSegments = parseRef(channelPointer).pointer;
  return (
    messageSegments.length === channelSegments.length + 2 &&
    messageSegments[channelSegments.length] === 'messages' &&
    channelSegments.every((segment, segmentIndex) => messageSegments[segmentIndex] === segment)
  );
}

function checkChannelAndMessages(
  node: { channel?: unknown; messages?: unknown },
  subject: 'Operation' | 'Operation reply',
  { report, location }: UserContext
) {
  const channelPointer = internalPointer(node.channel);

  if (channelPointer && !isRootSectionPointer(channelPointer, 'channels')) {
    report({
      message: `${subject} \`channel\` must reference a channel from the root \`channels\` object.`,
      location: location.child(['channel', '$ref']),
      reference: DOCS_REFERENCE,
    });
  }

  if (!channelPointer || !Array.isArray(node.messages)) return;

  for (const [messageIndex, message] of node.messages.entries()) {
    const messagePointer = internalPointer(message);
    if (messagePointer && !isChannelMessagePointer(messagePointer, channelPointer)) {
      report({
        message: `${subject} \`messages\` must reference messages of the referenced channel (\`${channelPointer}/messages/...\`).`,
        location: location.child(['messages', messageIndex, '$ref']),
        reference: DOCS_REFERENCE,
      });
    }
  }
}

export const SpecRefTargets: Async3Rule = () => {
  const rootOperations = new Set<unknown>();
  const rootReplies = new Set<unknown>();
  const rootChannels = new Set<unknown>();

  return {
    Root: {
      enter(root: Async3Definition) {
        for (const operation of Object.values(root.operations ?? {})) {
          if (!isPlainObject(operation) || isRef(operation)) continue;

          rootOperations.add(operation);
          if (isPlainObject(operation.reply) && !isRef(operation.reply)) {
            rootReplies.add(operation.reply);
          }
        }
        for (const channel of Object.values(root.channels ?? {})) {
          if (isPlainObject(channel) && !isRef(channel)) {
            rootChannels.add(channel);
          }
        }
      },
    },
    Operation(operation: Async3Operation, ctx: UserContext) {
      if (rootOperations.has(operation)) {
        checkChannelAndMessages(operation, 'Operation', ctx);
      }
    },
    OperationReply(reply: Record<string, unknown>, ctx: UserContext) {
      if (rootReplies.has(reply)) {
        checkChannelAndMessages(reply, 'Operation reply', ctx);
      }
    },
    Channel(channel: Channel, { report, location }: UserContext) {
      if (!rootChannels.has(channel) || !Array.isArray(channel.servers)) return;

      for (const [serverIndex, server] of channel.servers.entries()) {
        const serverPointer = internalPointer(server);
        if (serverPointer && !isRootSectionPointer(serverPointer, 'servers')) {
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
