import { ContentStructure } from '../types.js';

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
  // The pathString is now a direct key of your (flattened) content structure.
  // TypeScript will provide autocompletion for these keys.
  pathString: keyof ContentStructure,
  fallbackValue?: string
): string | undefined {
  if (!activeContent) {
    const msg = `[Contentstorage] getText: Content not loaded (Key: "${String(pathString)}"). Ensure setContentLanguage() was called and completed successfully.`;
    console.warn(msg);
    return fallbackValue;
  }

  // Direct lookup since activeContent is expected to be flat and pathString is a key.
  // We use Object.prototype.hasOwnProperty.call for safer property checking.
  if (Object.prototype.hasOwnProperty.call(activeContent, pathString)) {
    // Since pathString is `keyof CustomContentStructure`, activeContent[pathString] is type-safe.
    // However, CustomContentStructure is initially `[key: string]: any` in the library,
    // so we might need a cast here if strict typing is desired for `value`.
    // But the consumer's augmentation makes CustomContentStructure specific.
    const value = (activeContent as any)[pathString as string]; // Using `as string` because keys are strings with dots.

    if (typeof value === 'string') {
      return value;
    } else {
      const msg = `[Contentstorage] getText: Value at key "${String(pathString)}" is not a string (actual type: ${typeof value}).'}'.`;
      console.warn(msg);
      return fallbackValue;
    }
  } else {
    const msg = `[Contentstorage] getText: Key "${String(pathString)}" not found in loaded content'.`;
    console.warn(msg);
    return fallbackValue;
  }
}
