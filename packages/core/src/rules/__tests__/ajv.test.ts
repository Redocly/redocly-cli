import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAjv2020Constructor, mockAjvDraft4Constructor, mockAddFormats } = vi.hoisted(() => {
  const mockAjv2020Constructor = vi.fn();
  const mockAjvDraft4Constructor = vi.fn();
  const mockAddFormats = vi.fn();

  return { mockAjv2020Constructor, mockAjvDraft4Constructor, mockAddFormats };
});

vi.mock('@redocly/ajv/dist/2020.js', () => {
  return {
    default: vi.fn(function (...args: unknown[]) {
      return mockAjv2020Constructor(...args);
    }),
  };
});

vi.mock('@redocly/ajv/dist/draft4.js', () => {
  return {
    default: vi.fn(function (...args: unknown[]) {
      return mockAjvDraft4Constructor(...args);
    }),
  };
});

vi.mock('ajv-formats', () => {
  return {
    default: mockAddFormats,
  };
});

import { Location } from '../../ref-utils.js';
import type { Source } from '../../resolve.js';
import { validateJsonSchema, releaseAjvInstance } from '../ajv.js';

describe('ajv configuration', () => {
  const resolve = () => ({ node: undefined, location: undefined });
  const baseLocation = createBaseLocation();

  beforeEach(() => {
    releaseAjvInstance();
    vi.clearAllMocks();
  });

  describe('dialect selection by specVersion', () => {
    it('should use draft4 constructor for oas3_0', () => {
      const mockAjvInstance = createMockAjvInstance();
      mockAjvDraft4Constructor.mockReturnValue(mockAjvInstance);

      const schema = { type: 'integer' };

      validateJsonSchema(10, schema, {
        schemaLoc: baseLocation,
        instancePath: '/example',
        resolve,
        allowAdditionalProperties: true,
        specVersion: 'oas3_0',
      });

      expect(mockAjvDraft4Constructor).toHaveBeenCalledTimes(1);
      expect(mockAjv2020Constructor).not.toHaveBeenCalled();

      const constructorOptions = mockAjvDraft4Constructor.mock.calls[0][0];
      expect(constructorOptions.schemaId).toBe('id');
    });

    it('should use 2020 constructor for oas3_2', () => {
      const mockAjvInstance = createMockAjvInstance();
      mockAjv2020Constructor.mockReturnValue(mockAjvInstance);

      const schema = { type: 'integer' };

      validateJsonSchema(10, schema, {
        schemaLoc: baseLocation,
        instancePath: '/example',
        resolve,
        allowAdditionalProperties: true,
        specVersion: 'oas3_2',
      });

      expect(mockAjv2020Constructor).toHaveBeenCalledTimes(1);
      expect(mockAjvDraft4Constructor).not.toHaveBeenCalled();

      const constructorOptions = mockAjv2020Constructor.mock.calls[0][0];
      expect(constructorOptions.schemaId).toBe('$id');
    });
  });

  describe('AJV configuration options', () => {
    it('should pass correct options to draft4 constructor', () => {
      const mockAjvInstance = createMockAjvInstance();
      mockAjvDraft4Constructor.mockReturnValue(mockAjvInstance);

      const schema = { type: 'string' };

      validateJsonSchema('test', schema, {
        schemaLoc: baseLocation,
        instancePath: '/example',
        resolve,
        allowAdditionalProperties: true,
        specVersion: 'oas3_0',
      });

      const constructorOptions = mockAjvDraft4Constructor.mock.calls[0][0];

      expect(constructorOptions.schemaId).toBe('id');
      expect(constructorOptions.passContext).toBe(true);
    });

    it('should pass correct options to 2020 constructor', () => {
      const mockAjvInstance = createMockAjvInstance();
      mockAjv2020Constructor.mockReturnValue(mockAjvInstance);

      const schema = { type: 'string' };

      validateJsonSchema('test', schema, {
        schemaLoc: baseLocation,
        instancePath: '/example',
        resolve,
        allowAdditionalProperties: true,
        specVersion: 'oas3_1',
      });

      const constructorOptions = mockAjv2020Constructor.mock.calls[0][0];
      expect(constructorOptions.schemaId).toBe('$id');
      expect(constructorOptions.passContext).toBe(true);
    });

    it('should call addFormats for created instance', () => {
      const mockAjvInstance = createMockAjvInstance();
      mockAjvDraft4Constructor.mockReturnValue(mockAjvInstance);

      const schema = { type: 'string' };

      validateJsonSchema('test', schema, {
        schemaLoc: baseLocation,
        instancePath: '/example',
        resolve,
        allowAdditionalProperties: true,
        specVersion: 'oas3_0',
      });

      expect(mockAddFormats).toHaveBeenCalledTimes(1);
      expect(mockAddFormats).toHaveBeenCalledWith(mockAjvInstance);
    });
  });

  describe('schema ID key in addSchema', () => {
    it('should use "id" key for draft4 dialect', () => {
      const mockAddSchema = vi.fn();
      const mockGetSchema = vi.fn().mockReturnValue(undefined);
      const mockSetDefaultUnevaluatedProperties = vi.fn();
      const mockAjvInstance = {
        getSchema: mockGetSchema,
        addSchema: mockAddSchema,
        setDefaultUnevaluatedProperties: mockSetDefaultUnevaluatedProperties,
      };
      mockAjvDraft4Constructor.mockReturnValue(mockAjvInstance);

      const schema = { type: 'integer' };

      validateJsonSchema(10, schema, {
        schemaLoc: baseLocation,
        instancePath: '/example',
        resolve,
        allowAdditionalProperties: true,
        specVersion: 'oas3_0',
      });

      expect(mockAjvInstance.addSchema).toHaveBeenCalledTimes(1);
      const addedSchema = mockAjvInstance.addSchema.mock.calls[0][0];
      expect(addedSchema).toHaveProperty('id');
    });

    it('should use "$id" key for 2020 dialect', () => {
      const mockAddSchema = vi.fn();
      const mockGetSchema = vi.fn().mockReturnValue(undefined);
      const mockSetDefaultUnevaluatedProperties = vi.fn();
      const mockAjvInstance = {
        getSchema: mockGetSchema,
        addSchema: mockAddSchema,
        setDefaultUnevaluatedProperties: mockSetDefaultUnevaluatedProperties,
      };
      mockAjv2020Constructor.mockReturnValue(mockAjvInstance);

      const schema = { type: 'integer' };

      validateJsonSchema(10, schema, {
        schemaLoc: baseLocation,
        instancePath: '/example',
        resolve,
        allowAdditionalProperties: true,
        specVersion: 'oas3_1',
      });

      expect(mockAddSchema).toHaveBeenCalledTimes(1);
      const addedSchema = mockAddSchema.mock.calls[0][0];
      expect(addedSchema).toHaveProperty('$id');
    });
  });
});

function createMockAjvInstance() {
  const mockValidator = vi.fn().mockReturnValue(true);
  const mockGetSchema = vi.fn().mockReturnValue(mockValidator);
  const mockAddSchema = vi.fn();
  const mockSetDefaultUnevaluatedProperties = vi.fn();

  return {
    getSchema: mockGetSchema,
    addSchema: mockAddSchema,
    setDefaultUnevaluatedProperties: mockSetDefaultUnevaluatedProperties,
  };
}

function createBaseLocation(): Location {
  const mockSource = vi.fn() as unknown as Source;
  (mockSource as any).absoluteRef = 'file:///test.yaml';

  return new Location(mockSource, '#/paths/~1test');
}
