import { Assertions } from '../common/assertions/index.js';
import { Struct } from '../common/struct.js';
import { InfoContact } from '../common/info-contact.js';
import { InfoLicenseStrict } from '../common/info-license-strict.js';
import { OperationOperationId } from '../common/operation-operationId.js';
import { TagDescription } from '../common/tag-description.js';
import { TagsAlphabetical } from '../common/tags-alphabetical.js';
import { ChannelsKebabCase } from './channels-kebab-case.js';
import { NoChannelTrailingSlash } from './no-channel-trailing-slash.js';
import { NoDuplicatedTagNames } from '../common/no-duplicated-tag-names.js';
import { NoUnresolvedRefs } from '../common/no-unresolved-refs.js';
import { NoRequiredSchemaPropertiesUndefined } from '../common/no-required-schema-properties-undefined.js';
import { NoEnumTypeMismatch } from '../common/no-enum-type-mismatch.js';
import { NoSchemaTypeMismatch } from '../common/no-schema-type-mismatch.js';

import type { Async2Rule } from '../../visitors.js';
import type { Async2RuleSet } from '../../oas-types.js';

export const rules: Async2RuleSet<'built-in'> = {
  struct: Struct as Async2Rule,
  'no-unresolved-refs': NoUnresolvedRefs as Async2Rule,
  assertions: Assertions as Async2Rule,
  'info-contact': InfoContact as Async2Rule,
  'info-license-strict': InfoLicenseStrict as Async2Rule,
  'operation-operationId': OperationOperationId as Async2Rule,
  'channels-kebab-case': ChannelsKebabCase,
  'no-channel-trailing-slash': NoChannelTrailingSlash,
  'tag-description': TagDescription as Async2Rule,
  'tags-alphabetical': TagsAlphabetical as Async2Rule,
  'no-duplicated-tag-names': NoDuplicatedTagNames as Async2Rule,
  'no-required-schema-properties-undefined': NoRequiredSchemaPropertiesUndefined as Async2Rule,
  'no-enum-type-mismatch': NoEnumTypeMismatch as Async2Rule,
  'no-schema-type-mismatch': NoSchemaTypeMismatch as Async2Rule,
};

export const preprocessors = {};
