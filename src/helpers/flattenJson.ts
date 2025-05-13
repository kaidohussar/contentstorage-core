export function flattenJson(
  data: any,
  prefix: string = '',
  result: Record<string, any> = {}
): Record<string, any> {
  const stopFlatteningIfKeyExists = 'contentstorage_type';

  // Check if the current data is an object that should not be flattened further
  if (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) && // Must be an object, not an array
    Object.prototype.hasOwnProperty.call(data, stopFlatteningIfKeyExists)
  ) {
    if (prefix) {
      // If there's a prefix, this object is nested. Assign it directly.
      result[prefix] = data;
    } else {
      // This is the root object itself having the 'stopFlatteningIfKeyExists' key.
      // Consistent with how root primitives are handled (result remains empty),
      // we don't add it to the result if there's no prefix. The function's
      // purpose is to flatten *into* key-value pairs. If the root itself
      // is one of these "don't flatten" types, 'result' will remain empty,
      // which is consistent with the original function's behavior for root primitives.
    }
  } else if (typeof data === 'object' && data !== null) {
    // It's an object or array that should be processed further
    if (Array.isArray(data)) {
      if (data.length === 0 && prefix) {
        // Handle empty arrays if prefix exists
        result[prefix] = [];
      }
      data.forEach((item, index) => {
        // Recursively call, the check for 'stopFlatteningIfKeyExists' will apply to 'item'
        flattenJson(item, prefix ? `${prefix}.${index}` : `${index}`, result);
      });
    } else {
      // It's an object (and not a special one that stops flattening, due to the preceding 'if' block)
      let isEmptyObject = true;
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          isEmptyObject = false;
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          // Recursively call, the check for 'stopFlatteningIfKeyExists' will apply to 'data[key]'
          flattenJson(data[key], newPrefix, result);
        }
      }
      if (isEmptyObject && prefix) {
        // Handle empty objects (that were not 'special') if prefix exists
        result[prefix] = {};
      }
    }
  } else if (prefix) {
    // Primitive value (string, number, boolean, null) and has a prefix
    result[prefix] = data;
  }
  // If the initial data is a primitive and prefix is empty, result remains empty.
  // If the initial data is a 'special' object (contains 'stopFlatteningIfKeyExists')
  // and prefix is empty, result also remains empty based on the logic above.
  return result;
}
