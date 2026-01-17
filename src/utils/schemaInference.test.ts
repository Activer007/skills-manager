import { describe, it, expect } from 'vitest';
import { inferSchemaFromValues } from './schemaInference';

describe('inferSchemaFromValues', () => {
  it('should return empty schema for empty input', () => {
    expect(inferSchemaFromValues({})).toEqual({});
  });

  it('should infer boolean type', () => {
    const result = inferSchemaFromValues({ isEnabled: true });
    expect(result.isEnabled).toEqual({
      type: 'boolean',
      label: 'Is Enabled',
      default: true
    });
  });

  it('should infer number type', () => {
    const result = inferSchemaFromValues({ maxCount: 10 });
    expect(result.maxCount).toEqual({
      type: 'number',
      label: 'Max Count',
      default: 10
    });
  });

  it('should infer string type', () => {
    const result = inferSchemaFromValues({ apiKey: '123' });
    expect(result.apiKey).toEqual({
      type: 'string',
      label: 'Api Key',
      default: '123'
    });
  });

  it('should ignore complex types', () => {
    const result = inferSchemaFromValues({ config: { nested: true }, list: [1, 2] });
    expect(result).toEqual({});
  });

  it('should handle mixed types', () => {
    const input = {
      debug: false,
      port: 8080,
      host: 'localhost'
    };
    const result = inferSchemaFromValues(input);
    expect(result.debug.type).toBe('boolean');
    expect(result.port.type).toBe('number');
    expect(result.host.type).toBe('string');
  });
});
