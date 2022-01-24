import { Oas2Decorator } from '../../visitors';
import { RegistryDependencies } from '../common/registry-dependencies';
import { OperationDescriptionOverride } from '../common/operation-description-override';
import { TagDescriptionOverride } from '../common/tag-description-override';
import { InfoDescriptionOverride } from '../common/info-description-override';
import { RemoveXInternal } from '../common/remove-x-internal';

export const decorators = {
  'registry-dependencies': RegistryDependencies as Oas2Decorator,
  'operation-description-override': OperationDescriptionOverride as Oas2Decorator,
  'tag-description-override': TagDescriptionOverride as Oas2Decorator,
  'info-description-override': InfoDescriptionOverride as Oas2Decorator,
  'remove-x-internal': RemoveXInternal as Oas2Decorator
};
