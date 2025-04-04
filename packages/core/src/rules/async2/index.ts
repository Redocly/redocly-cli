import { Assertions } from '../common/assertions/index.js';
import { Struct } from '../common/struct.js';
import { InfoContact } from '../common/info-contact.js';
import { InfoLicenseStrict } from '../common/info-license-strict.js';
import { OperationOperationId } from '../common/operation-operationId.js';
import { TagDescription } from '../common/tag-description.js';
import { TagsAlphabetical } from '../common/tags-alphabetical.js';
import { ChannelsKebabCase } from './channels-kebab-case.js';
import { NoChannelTrailingSlash } from './no-channel-trailing-slash.js';

import type { Async2Rule } from '../../visitors.js';
import type { Async2RuleSet } from '../../oas-types.js';

export const rules: Async2RuleSet<'built-in'> = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore TODO: This is depricated property `spec` and should be removed in the future
  spec: Struct as Async2Rule,
  struct: Struct as Async2Rule,
  assertions: Assertions as Async2Rule,
  'info-contact': InfoContact as Async2Rule,
  'info-license-strict': InfoLicenseStrict as Async2Rule,
  'operation-operationId': OperationOperationId as Async2Rule,
  'channels-kebab-case': ChannelsKebabCase,
  'no-channel-trailing-slash': NoChannelTrailingSlash,
  'tag-description': TagDescription as Async2Rule,
  'tags-alphabetical': TagsAlphabetical as Async2Rule,
};

export const preprocessors = {};
