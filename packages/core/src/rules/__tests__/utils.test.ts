import { getAdditionalPropertiesOption } from '../utils';

describe('Rules utils', function () {
  describe('getAdditionalPropertiesOption', () => {
    it('should return actual option', () => {
      const options = {
        allowAdditionalProperties: true,
      };

      expect(getAdditionalPropertiesOption(options)).toBeTruthy();
    });

    it('should reverse option', () => {
      const options = {
        disallowAdditionalProperties: true,
      };

      expect(getAdditionalPropertiesOption(options)).toBeFalsy();
    });

    it('should throw error with message', () => {
      const options = {
        allowAdditionalProperties: true,
        disallowAdditionalProperties: false,
      };

      try {
        getAdditionalPropertiesOption(options);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual(
          "Do not use 'disallowAdditionalProperties' field. Use 'allowAdditionalProperties' instead.\n"
        );
      }
    });
  });
});
