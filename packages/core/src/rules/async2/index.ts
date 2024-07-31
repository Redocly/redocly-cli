import { Assertions } from '../common/assertions';
import { Spec } from '../common/spec';
import { InfoContact } from '../common/info-contact';
import { InfoLicenseStrict } from '../common/info-license-strict';
import { OperationOperationId } from '../common/operation-operationId';
import { TagDescription } from '../common/tag-description';
import { TagsAlphabetical } from '../common/tags-alphabetical';
import { ChannelsKebabCase } from './channels-kebab-case';
import { NoChannelTrailingSlash } from './no-channel-trailing-slash';

import type { Async2Rule } from '../../visitors';
import type { Async2RuleSet } from '../../oas-types';

export const rules: Async2RuleSet<'built-in'> = {
  spec: Spec as Async2Rule,
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
