// The TS emitters' shared option types. `DateType` is a NEUTRAL option (every
// language honors it), so it is defined in the authoring toolkit and re-exported
// here for the emitters that have always imported it from this module.

export type { DateType } from '../authoring/options.js';
