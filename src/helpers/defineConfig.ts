import { AppConfig } from '../types.js';

/**
 * Helper function to define your application configuration.
 * Provides autocompletion and type-checking for contentstorage.config.js files.
 */
export function defineConfig(config: AppConfig): AppConfig {
  // You can add basic runtime validation here if desired,
  // e.g., check if contentUrl is a valid URL format,
  // or if languageCodes is not empty.
  if (!config.languageCodes || config.languageCodes.length === 0) {
    console.warn(
      'Warning: languageCodes array is empty or missing in the configuration.'
    );
  }
  if (!config.contentDir) {
    // This would typically be a hard error, but defineConfig is more for type safety at edit time.
    // Runtime validation (see point 3) is better for hard errors.
    console.warn('Warning: contentDir is missing in the configuration.');
  }
  // ... other checks

  return config;
}
