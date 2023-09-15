import { Async2Rule } from '../../visitors';
import { Assertions } from '../common/assertions';
import { Spec } from '../common/spec';
import { InfoContact } from '../common/info-contact';
import { OperationOperationId } from '../common/operation-operationId';
import { TagDescription } from '../common/tag-description';
import { TagsAlphabetical } from '../common/tags-alphabetical';
import { ChannelsKebabCase } from './channels-kebab-case';
import { NoChannelTrailingSlash } from './no-channel-trailing-slash';

export const rules = {
  spec: Spec as Async2Rule,
  assertions: Assertions,
  'info-contact': InfoContact,
  'operation-operationId': OperationOperationId,
  'channels-kebab-case': ChannelsKebabCase,
  'no-channel-trailing-slash': NoChannelTrailingSlash,
  'tag-description': TagDescription,
  'tags-alphabetical': TagsAlphabetical,
};

export const preprocessors = {};
