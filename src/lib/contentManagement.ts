import { ContentStructure, DotNotationPaths } from '../types.js';

import fs from 'fs/promises';
import path from 'path';

let activeContent: ContentStructure | null = null;
let activeLanguage: string | null = null;

/**
 * Loads and sets the content for a specific language.
 * It will internally ensure the application configuration (for contentDir) is loaded.
 * @param languageCode The language code (e.g., 'EN', 'FR') for the JSON file to load.
 */
export async function setContentLanguage(
  contentDir: string,
  languageCode: string
): Promise<void> {
  if (
    !contentDir ||
    typeof contentDir !== 'string' ||
    contentDir.trim() === ''
  ) {
    throw new Error(
      '[Contentstorage] Invalid contentUrl provided to setContentLanguage.'
    );
  }

  if (
    !languageCode ||
    typeof languageCode !== 'string' ||
    languageCode.trim() === ''
  ) {
    throw new Error(
      '[Contentstorage] Invalid language code provided to setContentLanguage.'
    );
  }

  const targetFilename = `${languageCode}.json`;
  const jsonFilePath = path.join(contentDir, targetFilename);

  console.log(
    `[Contentstorage] Attempting to load content for language '${languageCode}' from ${jsonFilePath}...`
  );

  try {
    const jsonContentString = await fs.readFile(jsonFilePath, 'utf-8');
    activeContent = JSON.parse(jsonContentString) as ContentStructure; // Relies on augmentation
    activeLanguage = languageCode;
    console.log(
      `[Contentstorage] Content for language '${languageCode}' loaded successfully.`
    );
  } catch (error) {
    activeContent = null; // Reset on failure
    console.error(
      `[Contentstorage] Failed to load content for language '${languageCode}' from ${jsonFilePath}. Error: ${(error as Error).message}`
    );
    throw new Error(
      `[Contentstorage] Could not load content for language: ${languageCode}. Ensure file exists at '${jsonFilePath}' and is valid JSON.`
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
      const msg = `[Contentstorage] getText: Path "${String(pathString)}" not found in loaded content for language '${activeLanguage}'.`;
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

/**
 * Gets the currently active language code.
 * @returns The active language code or null if no language is set.
 */
export function getCurrentLanguage(): string | null {
  return activeLanguage;
}
