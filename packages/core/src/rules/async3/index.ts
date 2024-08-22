import { Assertions } from '../common/assertions';
import { Spec } from '../common/spec';
import { InfoContact } from '../common/info-contact';
import { InfoLicenseStrict } from '../common/info-license-strict';
import { OperationOperationId } from '../common/operation-operationId';
import { TagDescription } from '../common/tag-description';
import { TagsAlphabetical } from '../common/tags-alphabetical';
import { ChannelsKebabCase } from './channels-kebab-case';
import { NoChannelTrailingSlash } from './no-channel-trailing-slash';

import type { Async3Rule } from '../../visitors';
import type { Async3RuleSet } from '../../oas-types';

export const rules: Async3RuleSet<'built-in'> = {
  spec: Spec as Async3Rule,
  assertions: Assertions as Async3Rule,
  'info-contact': InfoContact as Async3Rule,
  'info-license-strict': InfoLicenseStrict as Async3Rule,
  'operation-operationId': OperationOperationId as Async3Rule,
  'channels-kebab-case': ChannelsKebabCase,
  'no-channel-trailing-slash': NoChannelTrailingSlash,
  'tag-description': TagDescription as Async3Rule,
  'tags-alphabetical': TagsAlphabetical as Async3Rule,
};

export const preprocessors = {};
