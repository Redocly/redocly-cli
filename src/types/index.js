import * as OAS3DefaultDefinitionMap from './OAS3';
import * as OAS2DefaultDefinitionMap from './OAS2';

const mergedDefinitionsMap = {
  OAS3: OAS3DefaultDefinitionMap,
  OAS2: OAS2DefaultDefinitionMap,
};

export * from './OAS3';
export default mergedDefinitionsMap;
