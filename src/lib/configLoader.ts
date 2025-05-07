import path from 'path';
import fs from 'fs';

export interface AppConfig {
  contentUrl: string;
  contentDir: string;
  typesOutputFile: string;
}

const DEFAULT_CONFIG: Partial<AppConfig> = {
  contentDir: path.join('src', 'assets', 'content'),
  typesOutputFile: path.join('src', 'generated', 'content-types.ts'),
};

export function loadConfig(): AppConfig {
  const configPath = path.resolve(process.cwd(), 'contentstorage.config.ts'); // Look in user's current working dir
  let userConfig: Partial<AppConfig> = {};

  if (fs.existsSync(configPath)) {
    try {
      // Use require for JS config file
      const loadedModule = require(configPath);
      userConfig = loadedModule.default || loadedModule;
      console.log(`Loaded configuration from ${configPath}`);
    } catch (error) {
      console.error(`Error loading configuration from ${configPath}:`, error);
      // Decide if you want to proceed with defaults or exit
      // For now, we'll proceed with defaults but warn
      console.warn('Proceeding with default configuration.');
      userConfig = {}; // Reset in case of partial load failure
    }
  } else {
    console.log('No content.config.js found. Using default configuration.');
  }

  const mergedConfig: Partial<AppConfig> = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  // Validate required fields
  if (!mergedConfig.contentUrl) {
    console.error(
      'Error: Configuration is missing the required "contentUrl" property.'
    );
    process.exit(1); // Exit if required URL is missing
  }

  // Resolve paths relative to the user's project root (process.cwd())
  const finalConfig: AppConfig = {
    contentUrl: mergedConfig.contentUrl,
    contentDir: path.resolve(process.cwd(), mergedConfig.contentDir!),
    typesOutputFile: path.resolve(process.cwd(), mergedConfig.typesOutputFile!),
  };

  return finalConfig;
}
