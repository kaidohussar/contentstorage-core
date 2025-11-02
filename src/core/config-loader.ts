import path from 'path';
import fs from 'fs';
import { AppConfig } from '../types.js';
import chalk from 'chalk';

const DEFAULT_CONFIG: Partial<AppConfig> = {
  languageCodes: [],
  contentDir: path.join('src', 'content', 'json'),
  typesOutputFile: path.join('src', 'content', 'content-types.ts'),
};

export async function loadConfig(): Promise<AppConfig> {
  const configPath = path.resolve(process.cwd(), 'contentstorage.config.js'); // Look in user's current working dir
  let userConfig: Partial<AppConfig> = {};

  if (fs.existsSync(configPath)) {
    try {
      // Use require for JS config file
      const loadedModule = await import(configPath);
      userConfig = loadedModule.default || loadedModule;
      console.log(chalk.blue('Loaded config', JSON.stringify(userConfig)));
      console.log(chalk.blue(`Loaded configuration from ${configPath}`));
    } catch (error) {
      console.error(
        chalk.red(`Error loading configuration from ${configPath}:`, error)
      );
      // Decide if you want to proceed with defaults or exit
      // For now, we'll proceed with defaults but warn
      console.warn(chalk.yellow('Proceeding with default configuration.'));
      userConfig = {}; // Reset in case of partial load failure
    }
  } else {
    console.log(chalk.blue('No content.config.js found. Continuing.'));
  }

  const mergedConfig: Partial<AppConfig> = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const finalConfig: AppConfig = {
    languageCodes: mergedConfig.languageCodes || [],
    contentKey: mergedConfig.contentKey || '',
    contentDir: path.resolve(process.cwd(), mergedConfig.contentDir!),
    typesOutputFile: path.resolve(process.cwd(), mergedConfig.typesOutputFile!),
  };

  return finalConfig;
}
