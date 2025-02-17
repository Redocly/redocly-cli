import { validateSuccessCriteria, isRegexpSuccessCriteria } from '../../../flow-runner';

describe('validateSuccessCriteria', () => {
  describe('Simple criteria', () => {
    it('throws an error if an unexpected key is present', () => {
      expect(() => {
        validateSuccessCriteria([
          {
            condition: 'status === 400',
          },
          {
            condition: '3.14 === 3.14',
          },
        ]);
      }).not.toThrow();
    });

    it('throws an error if an unknown key is present', () => {
      expect(() => {
        validateSuccessCriteria([
          {
            condition: '$name === 400',
          },
        ]);
      }).toThrowError(`Success criteria condition $name === 400 is not allowed.`);
    });

    it('does not throw an error if all keys are expected', () => {
      expect(() => {
        validateSuccessCriteria([
          {
            condition: '$statusCode === 400',
          },
        ]);
      }).not.toThrow();
    });
  });
  describe('RegexpSuccessCriteria', () => {
    it('throws an error if not allowed key is present', () => {
      expect(() => {
        validateSuccessCriteria([
          {
            type: 'regex',
            context: '$someUnknownKey',
            condition: 'status === 400',
          },
        ]);
      }).toThrowError(`Success criteria context "$someUnknownKey" is not allowed.`);
    });

    it('throws an error if an unexpected key is present', () => {
      expect(() => {
        validateSuccessCriteria([
          {
            type: 'regex',
            context: 'UnknownKey',
            condition: 'status === 400',
          },
        ]);
      }).toThrowError(`"UnknownKey" does not contain any valid context.`);
    });

    it('does not throw an error if all keys are expected', () => {
      expect(() => {
        validateSuccessCriteria([
          {
            type: 'regex',
            context: '$statusCode',
            condition: '^200$',
          },
        ]);
      }).not.toThrow();
    });
  });
  describe('jsonpath', () => {
    it('throws an error if context is missing', () => {
      expect(() => {
        validateSuccessCriteria([
          {
            type: 'jsonpath',
            condition: '$.pets[?(@.length>3)] || $.access_token != null',
          },
        ]);
      }).toThrowError(`jsonpath success criteria context is required.`);
    });

    it('throws an error if condition is missing', () => {
      expect(() => {
        validateSuccessCriteria([
          {
            type: 'jsonpath',
            context: '$response.body',
            condition: '',
          },
        ]);
      }).toThrowError(`jsonpath success criteria condition is required.`);
    });

    it('does not throw an error if all keys are expected', () => {
      expect(() => {
        validateSuccessCriteria([
          {
            type: {
              type: 'jsonpath',
              version: 'draft-goessner-dispatch-jsonpath-00',
            },
            context: '$response.body',
            condition: '$.pets[?(@.length>3)] || $.access_token != null',
          },
        ]);
      }).not.toThrow();
    });
  });
});

describe('isRegexpSuccessCriteria', () => {
  it('returns true if the criteria is a RegexpSuccessCriteria', () => {
    expect(
      isRegexpSuccessCriteria({
        type: 'regex',
        context: '$statusCode',
        condition: '^200$',
      }),
    ).toBe(true);
  });

  it('returns false if the criteria is not a RegexpSuccessCriteria', () => {
    expect(
      isRegexpSuccessCriteria({
        type: {
          type: 'jsonpath',
          version: 'draft-goessner-dispatch-jsonpath-00',
        },
        context: '$statusCode',
        condition: '200',
      }),
    ).toBe(false);
  });
});
