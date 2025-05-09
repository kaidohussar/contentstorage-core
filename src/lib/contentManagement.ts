import { AppConfig, ContentStructure, DotNotationPaths } from '../types.js';

import fs from 'fs/promises';
import path from 'path';
import { loadConfig } from './configLoader.js';

let activeContent: ContentStructure | null = null;
let activeLanguage: string | null = null;
let loadedAppConfig: AppConfig | null = null; // Cache for the loaded config

/**
 * Ensures the application configuration (especially contentDir) is loaded.
 * Calls your library's loadConfig function.
 */
async function ensureConfigInitialized(): Promise<AppConfig> {
  if (loadedAppConfig) {
    return loadedAppConfig;
  }
  try {
    const config = await loadConfig(); // This is your library's function
    if (!config || !config.contentDir) {
      throw new Error(
        'contentDir not found in the loaded configuration (contentstorage.config.js).'
      );
    }
    loadedAppConfig = config as AppConfig; // Ensure it matches the expected structure
    console.log(
      `[LocalizationLibrary] Configuration loaded. Content directory set to: ${loadedAppConfig.contentDir}`
    );
    return loadedAppConfig;
  } catch (error) {
    console.error(
      '[Contentstorage] Failed to initialize configuration:',
      error
    );
    throw new Error(
      `[Contentstorage] Critical error: Could not load or validate app configuration. ${(error as Error).message}`
    );
  }
}

/**
 * Loads and sets the content for a specific language.
 * It will internally ensure the application configuration (for contentDir) is loaded.
 * @param languageCode The language code (e.g., 'EN', 'FR') for the JSON file to load.
 */
export async function setContentLanguage(languageCode: string): Promise<void> {
  if (
    !languageCode ||
    typeof languageCode !== 'string' ||
    languageCode.trim() === ''
  ) {
    throw new Error(
      '[Contentstorage] Invalid language code provided to setContentLanguage.'
    );
  }

  const config = await ensureConfigInitialized(); // Gets contentDir from loaded config

  const targetFilename = `${languageCode}.json`;
  const jsonFilePath = path.join(config.contentDir, targetFilename);

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
