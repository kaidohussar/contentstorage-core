export function flattenJson(
  data: any,
  prefix: string = '',
  result: Record<string, string> = {}
): Record<string, string> {
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        flattenJson(item, prefix ? `${prefix}.${index}` : `${index}`, result);
      });
    } else {
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          flattenJson(data[key], newPrefix, result);
        }
      }
    }
  } else if (prefix) {
    result[prefix] = String(data);
  }
  return result;
}
