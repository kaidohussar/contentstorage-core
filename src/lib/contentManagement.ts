import { ContentStructure, DotNotationPaths } from '../types.js';

let activeContent: ContentStructure | null = null;

/**
 * Loads and sets the content for a specific language.
 * It will internally ensure the application configuration (for contentDir) is loaded.
 * @param languageCode The language code (e.g., 'EN', 'FR') for the JSON file to load.
 */
export async function setContentLanguage(
  contentJson: ContentStructure | null
): Promise<void> {
  if (!contentJson || typeof contentJson !== 'object') {
    throw new Error(
      '[Contentstorage] Invalid contentUrl provided to setContentLanguage.'
    );
  }

  try {
    activeContent = contentJson as ContentStructure; // Relies on augmentation
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
  // @ts-expect-error Is fine
  pathString: DotNotationPaths,
  fallbackValue?: string
): string | undefined {
  if (!activeContent) {
    const msg = `[Contentstorage] getText: Content not loaded (Path: "${String(pathString)}"). Ensure setContentLanguage() was called and completed successfully.`;
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
