import { ContentStructure, ImageObject, VariationObject } from '../types.js';

let activeContent: object | null = null;

/**
 * Loads and sets the content for a specific language.
 * It will internally ensure the application configuration (for contentDir) is loaded.
 * @param languageCode The language code (e.g., 'EN', 'FR') for the JSON file to load.
 */
export function setContentLanguage(contentJson: object) {
  if (!contentJson || typeof contentJson !== 'object') {
    throw new Error(
      '[Contentstorage] Invalid contentUrl provided to setContentLanguage.'
    );
  }

  try {
    activeContent = contentJson; // Relies on augmentation
    console.log(`[Contentstorage] Content loaded.`);
  } catch (error) {
    activeContent = null; // Reset on failure
    console.error(
      `[Contentstorage] Failed to load content. Error: ${(error as Error).message}`
    );
  }
}

/**
 * Retrieves the text string from the loaded JSON content for the given path.
 * Autocompletion for pathString is enabled via module augmentation of CustomContentStructure.
 * `setContentLanguage()` must be called successfully before using this.
 *
 * @param pathString A dot-notation path string (e.g., 'HomePage.Login'). Autocompletion is provided.
 * @param fallbackValue Optional string to return if the path is not found or the value is not a string.
 * If not provided, and path is not found/value not string, undefined is returned.
 * @returns The text string from the JSON, or the fallbackValue, or undefined.
 */
export function getText(
  pathString: keyof ContentStructure,
  fallbackValue?: string
): string | undefined {
  if (!activeContent) {
    const msg = `[Contentstorage] getText: Content not loaded (Key: "${String(pathString)}"). Ensure setContentLanguage() was called and completed successfully.`;
    console.warn(msg);
    return fallbackValue;
  }

  const keys = (pathString as string).split('.');
  let current: any = activeContent;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      const msg = `[Contentstorage] getText: Path "${String(pathString)}" not found in loaded content.`;
      console.warn(msg);
      return fallbackValue;
    }
  }

  if (typeof current === 'string') {
    return current;
  } else {
    const msg = `[Contentstorage] getText: Value at path "${String(pathString)}" is not a string (actual type: ${typeof current}).`;
    console.warn(msg);
    return fallbackValue;
  }
}

export function getImage(
  pathString: keyof ContentStructure,
  fallbackValue?: ImageObject
): ImageObject | undefined {
  if (!activeContent) {
    const msg = `[Contentstorage] getImage: Content not loaded (Key: "${pathString}"). Ensure setContentLanguage() was called and completed successfully.`;
    console.warn(msg);
    return fallbackValue;
  }

  const keys = (pathString as string).split('.');
  let current: any = activeContent;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      const msg = `[Contentstorage] getImage: Path "${pathString}" not found in loaded content.`;
      console.warn(msg);
      return fallbackValue;
    }
  }

  if (
    current &&
    typeof current === 'object' &&
    current.contentstorage_type === 'image' &&
    typeof current.url === 'string' &&
    typeof current.altText === 'string'
  ) {
    return current as ImageObject;
  } else {
    const msg = `[Contentstorage] getImage: Value at path "${pathString}" is not a valid image object (actual value: ${JSON.stringify(current)}).`;
    console.warn(msg);
    return fallbackValue;
  }
}

export function getVariation<Path extends keyof ContentStructure>(
  pathString: Path,
  variationKey?: ContentStructure[Path] extends { data: infer D } ? keyof D : string,
  fallbackString?: string
): string | undefined {
  if (!activeContent) {
    const msg = `[Contentstorage] getVariation: Content not loaded (Key: "${pathString}", Variation: "${variationKey?.toString()}"). Ensure setContentLanguage() was called and completed successfully.`;
    console.warn(msg);
    return fallbackString;
  }

  const keys = (pathString as string).split('.');
  let current: any = activeContent;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      const msg = `[Contentstorage] getVariation: Path "${pathString}" for variation object not found in loaded content.`;
      console.warn(msg);
      return fallbackString;
    }
  }

  if (
    current &&
    typeof current === 'object' &&
    current.contentstorage_type === 'variation' &&
    typeof current.data === 'object' &&
    current.data !== null
  ) {
    const variationObject = current as VariationObject;

    if (variationKey && typeof variationKey === 'string' && variationKey in variationObject.data) {
      if (typeof variationObject.data[variationKey] === 'string') {
        return variationObject.data[variationKey];
      } else {
        const msg = `[Contentstorage] getVariation: Variation value for key "${variationKey}" at path "${pathString}" is not a string (actual type: ${typeof variationObject.data[variationKey]}).`;
        console.warn(msg);
      }
    }

    // If specific variationKey is not found or not provided, try to return the 'default' variation
    if ('default' in variationObject.data && typeof variationKey === 'string') {
      if (typeof variationObject.data.default === 'string') {
        if (variationKey && variationKey !== 'default') { // Warn if specific key was requested but default is being returned
          const msg = `[Contentstorage] getVariation: Variation key "${variationKey}" not found at path "${pathString}". Returning 'default' variation.`;
          console.warn(msg);
        }
        return variationObject.data.default;
      } else {
        const msg = `[Contentstorage] getVariation: 'default' variation value at path "${pathString}" is not a string (actual type: ${typeof variationObject.data.default}).`;
        console.warn(msg);
      }
    }

    // If neither specific key nor 'default' is found or valid
    const msg = `[Contentstorage] getVariation: Neither variation key "${variationKey?.toString()}" nor 'default' variation found or valid at path "${pathString}".`;
    console.warn(msg);
    return fallbackString;

  } else {
    const msg = `[Contentstorage] getVariation: Value at path "${pathString}" is not a valid variation object (actual value: ${JSON.stringify(current)}).`;
    console.warn(msg);
    return fallbackString;
  }
}


