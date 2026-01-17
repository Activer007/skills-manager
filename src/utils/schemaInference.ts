import type { ConfigSchema, ConfigSchemaItem } from '../components/ConfigForm';

/**
 * Infers a configuration schema from a record of values.
 *
 * @param values The configuration values object
 * @returns A ConfigSchema object
 */
export const inferSchemaFromValues = (values: Record<string, unknown>): ConfigSchema => {
  const schema: ConfigSchema = {};

  if (!values || typeof values !== 'object') {
    return schema;
  }

  Object.entries(values).forEach(([key, value]) => {
    // Skip null or undefined values as we can't infer type reliably
    // (though we could default to string, but let's be safe)
    if (value === null || value === undefined) {
      return;
    }

    const item: ConfigSchemaItem = {
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(), // Capitalize and split camelCase
      type: 'string', // Default
    };

    const valueType = typeof value;

    if (valueType === 'boolean') {
      item.type = 'boolean';
      item.default = value;
    } else if (valueType === 'number') {
      item.type = 'number';
      item.default = value;
    } else if (valueType === 'string') {
      item.type = 'string';
      item.default = value;
    } else {
      // Skip complex types like objects or arrays for now as per instructions
      return;
    }

    schema[key] = item;
  });

  return schema;
};
