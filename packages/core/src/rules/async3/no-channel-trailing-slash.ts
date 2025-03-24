import type { Async3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import type { Channel } from '../../typings/asyncapi3.js';

export const NoChannelTrailingSlash: Async3Rule = () => {
  return {
    Channel(channel: Channel, { report, location }: UserContext) {
      if (channel?.address?.endsWith('/') && channel?.address !== '/') {
        report({
          message: `\`${channel.address}\` should not have a trailing slash.`,
          location: location.key(),
        });
      }
    },
  };
};
