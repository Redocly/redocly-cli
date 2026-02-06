import { FilterIn } from '../common/filters/filter-in.js';
import { FilterOut } from '../common/filters/filter-out.js';
import { InfoDescriptionOverride } from '../common/info-description-override.js';
import { InfoOverride } from '../common/info-override.js';
import { OperationDescriptionOverride } from '../common/operation-description-override.js';
import { RemoveXInternal } from '../common/remove-x-internal.js';
import { TagDescriptionOverride } from '../common/tag-description-override.js';
import { RemoveUnusedComponents } from './remove-unused-components.js';

import type { Oas2Decorator } from '../../visitors.js';

export const decorators = {
  'operation-description-override': OperationDescriptionOverride as Oas2Decorator,
  'tag-description-override': TagDescriptionOverride as Oas2Decorator,
  'info-description-override': InfoDescriptionOverride as Oas2Decorator,
  'info-override': InfoOverride as Oas2Decorator,
  'remove-x-internal': RemoveXInternal as Oas2Decorator,
  'remove-unused-components': RemoveUnusedComponents,
  'filter-in': FilterIn as Oas2Decorator,
  'filter-out': FilterOut as Oas2Decorator,
};
