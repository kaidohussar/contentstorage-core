export function populateTextWithVariables(text: string, variables: Record<string, any>, textKey: string) {
  return text.replace(/\{(\w+)}/g, (placeholder, variableName) => {
    if (Object.prototype.hasOwnProperty.call(variables, variableName)) {
      const value = variables[variableName];
      return String(value);
    }

    console.warn(
      `[getText] Variable "${variableName}" for text id "${textKey}" not found in provided variables. Placeholder "${placeholder}" will be replaced with an empty string.`
    );
    return placeholder;
  })
}