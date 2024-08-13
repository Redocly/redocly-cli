import { Assertions } from '../common/assertions/index.js';
import { Spec } from '../common/spec.js';
import { InfoContact } from '../common/info-contact.js';
import { OperationOperationId } from '../common/operation-operationId.js';
import { TagDescription } from '../common/tag-description.js';
import { TagsAlphabetical } from '../common/tags-alphabetical.js';
import { ChannelsKebabCase } from './channels-kebab-case.js';
import { NoChannelTrailingSlash } from './no-channel-trailing-slash.js';

import type { Async2Rule } from '../../visitors.js';
import type { Async2RuleSet } from '../../oas-types.js';

export const rules: Async2RuleSet<'built-in'> = {
  spec: Spec as Async2Rule,
  assertions: Assertions as Async2Rule,
  'info-contact': InfoContact as Async2Rule,
  'operation-operationId': OperationOperationId as Async2Rule,
  'channels-kebab-case': ChannelsKebabCase,
  'no-channel-trailing-slash': NoChannelTrailingSlash,
  'tag-description': TagDescription as Async2Rule,
  'tags-alphabetical': TagsAlphabetical as Async2Rule,
};

export const preprocessors = {};
