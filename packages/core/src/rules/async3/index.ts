import { Assertions } from '../common/assertions/index.js';
import { Spec } from '../common/spec.js';
import { InfoContact } from '../common/info-contact.js';
import { OperationOperationId } from '../common/operation-operationId.js';
import { TagDescription } from '../common/tag-description.js';
import { TagsAlphabetical } from '../common/tags-alphabetical.js';
import { ChannelsKebabCase } from './channels-kebab-case.js';
import { NoChannelTrailingSlash } from './no-channel-trailing-slash.js';

import type { Async3Rule } from '../../visitors.js';
import type { Async3RuleSet } from '../../oas-types.js';

export const rules: Async3RuleSet<'built-in'> = {
  spec: Spec as Async3Rule,
  assertions: Assertions as Async3Rule,
  'info-contact': InfoContact as Async3Rule,
  'operation-operationId': OperationOperationId as Async3Rule,
  'channels-kebab-case': ChannelsKebabCase,
  'no-channel-trailing-slash': NoChannelTrailingSlash,
  'tag-description': TagDescription as Async3Rule,
  'tags-alphabetical': TagsAlphabetical as Async3Rule,
};

export const preprocessors = {};
