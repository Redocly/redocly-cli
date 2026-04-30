import { type Oas3DecoratorsSet } from '../../oas-types.js';
import { type Oas3Decorator } from '../../visitors.js';
import { FilterIn } from '../common/filters/filter-in.js';
import { FilterOut } from '../common/filters/filter-out.js';
import { InfoDescriptionOverride } from '../common/info-description-override.js';
import { InfoOverride } from '../common/info-override.js';
import { OperationDescriptionOverride } from '../common/operation-description-override.js';
import { RemoveXInternal } from '../common/remove-x-internal.js';
import { TagDescriptionOverride } from '../common/tag-description-override.js';
import { MediaTypeExamplesOverride } from './media-type-examples-override.js';
import { RemoveUnusedComponents } from './remove-unused-components.js';

export const decorators: Oas3DecoratorsSet<'built-in'> = {
  'operation-description-override': OperationDescriptionOverride as Oas3Decorator,
  'tag-description-override': TagDescriptionOverride as Oas3Decorator,
  'info-description-override': InfoDescriptionOverride as Oas3Decorator,
  'info-override': InfoOverride as Oas3Decorator,
  'remove-x-internal': RemoveXInternal as Oas3Decorator,
  'filter-in': FilterIn as Oas3Decorator,
  'filter-out': FilterOut as Oas3Decorator,
  'media-type-examples-override': MediaTypeExamplesOverride,
  'remove-unused-components': RemoveUnusedComponents,
};
