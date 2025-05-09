export function flattenJson(
  data: any,
  prefix: string = '',
  result: Record<string, any> = {}
): Record<string, any> {
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      if (data.length === 0 && prefix) {
        // Handle empty arrays if prefix exists
        result[prefix] = [];
      }
      data.forEach((item, index) => {
        flattenJson(item, prefix ? `${prefix}.${index}` : `${index}`, result);
      });
    } else {
      // It's an object
      let isEmptyObject = true;
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          isEmptyObject = false;
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          flattenJson(data[key], newPrefix, result);
        }
      }
      if (isEmptyObject && prefix) {
        // Handle empty objects if prefix exists
        result[prefix] = {};
      }
    }
  } else if (prefix) {
    // Primitive value (string, number, boolean, null)
    result[prefix] = data;
  }
  // If the initial data itself is a primitive and prefix is empty, it means we can't flatten it into key-value pairs.
  // This function is designed to take a root object or array.
  // If the root `data` is a primitive, `result` would remain empty, which is fine; `pullContent` should validate the root.
  return result;
}
