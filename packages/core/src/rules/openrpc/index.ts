import type { OpenRpc1RuleSet } from '../../oas-types.js';
import type { OpenRpc1Rule } from '../../visitors.js';
import { Assertions } from '../common/assertions/index.js';
import { InfoContact } from '../common/info-contact.js';
import { InfoLicense } from '../common/info-license.js';
import { NoUnresolvedRefs } from '../common/no-unresolved-refs.js';
import { Struct } from '../common/struct.js';
import { NoUnusedComponents } from './no-unused-components.js';
import { NoDuplicatedMethodParams } from './spec-no-duplicated-method-params.js';
import { NoRequiredParamsAfterOptional } from './spec-no-required-params-after-optional.js';

export const rules: OpenRpc1RuleSet<'built-in'> = {
  struct: Struct as OpenRpc1Rule,
  'no-unresolved-refs': NoUnresolvedRefs as OpenRpc1Rule,
  assertions: Assertions as OpenRpc1Rule,
  'info-license': InfoLicense as OpenRpc1Rule,
  'no-unused-components': NoUnusedComponents,
  'info-contact': InfoContact as OpenRpc1Rule,
  'spec-no-duplicated-method-params': NoDuplicatedMethodParams,
  'spec-no-required-params-after-optional': NoRequiredParamsAfterOptional,
};

export const preprocessors = {};
