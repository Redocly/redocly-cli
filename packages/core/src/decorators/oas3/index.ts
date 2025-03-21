import { OperationDescriptionOverride } from '../common/operation-description-override.js';
import { TagDescriptionOverride } from '../common/tag-description-override.js';
import { InfoDescriptionOverride } from '../common/info-description-override.js';
import { InfoOverride } from '../common/info-override.js';
import { RemoveXInternal } from '../common/remove-x-internal.js';
import { FilterIn } from '../common/filters/filter-in.js';
import { FilterOut } from '../common/filters/filter-out.js';
import { MediaTypeExamplesOverride } from '../common/media-type-examples-override.js';

import type { Oas3Decorator } from '../../visitors.js';

export const decorators = {
  'operation-description-override': OperationDescriptionOverride as Oas3Decorator,
  'tag-description-override': TagDescriptionOverride as Oas3Decorator,
  'info-description-override': InfoDescriptionOverride as Oas3Decorator,
  'info-override': InfoOverride as Oas3Decorator,
  'remove-x-internal': RemoveXInternal as Oas3Decorator,
  'filter-in': FilterIn as Oas3Decorator,
  'filter-out': FilterOut as Oas3Decorator,
  'media-type-examples-override': MediaTypeExamplesOverride as Oas3Decorator,
};
