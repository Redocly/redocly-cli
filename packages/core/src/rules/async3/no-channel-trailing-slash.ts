import { Async2Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Channel } from '../../typings/asyncapi3';

export const NoChannelTrailingSlash: Async2Rule = () => {
  return {
    Channel(channel: Channel, { report, location }: UserContext) {
      if ((channel.address as string).endsWith('/') && channel.address !== '/') {
        report({
          message: `\`${channel.address}\` should not have a trailing slash.`,
          location: location.key(),
        });
      }
    },
  };
};
